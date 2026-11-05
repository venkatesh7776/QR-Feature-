import "server-only";
import { r2Configured, r2Files } from "./file-store";
import type { Folder, FolderSummary, Memory, Reactions } from "../lib/types";
import { contentTypeFor, fileUrl, isSafeFileRef, shortId, storedName, type NewMemory, type StoredFile } from "./shared";

/**
 * Permanent persistence on Cloudflare: records (albums, notes, reactions,
 * names) in a D1 database, photos and voice notes in an R2 bucket.
 * Schema: db/schema.sql. D1 is reached through Cloudflare's HTTP API with an
 * API token, so this runs anywhere (here, on Vercel) and only on the server.
 */

function accountId() {
  return process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID;
}

export function isConfigured() {
  return !!(accountId() && process.env.D1_DATABASE_ID && process.env.CLOUDFLARE_API_TOKEN && r2Configured());
}

/** Runs one SQL statement against D1 and returns its rows. */
async function d1<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId()}/d1/database/${process.env.D1_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
      cache: "no-store",
    },
  );
  const body = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: { message: string }[];
    result?: { results: T[] }[];
  };
  if (!res.ok || !body.success) throw new Error(`D1: ${body.errors?.[0]?.message ?? `HTTP ${res.status}`}`);
  return body.result?.[0]?.results ?? [];
}

const files = () => r2Files();

// ---- Row mapping -------------------------------------------------------------

interface FolderRow {
  id: string;
  name: string;
  event_date: string | null;
  event_type: string | null;
  created_at: string;
}

interface SummaryRow extends FolderRow {
  photo_count: number;
  preview_names: string | null; // JSON array
}

interface MemoryRow {
  id: string;
  folder_id: string;
  source: Memory["source"];
  photo_name: string;
  message: string | null;
  guest_name: string | null;
  reactions: string | null; // JSON object
  voice_name: string | null;
  created_at: string;
}

function toFolder(r: FolderRow): Folder {
  return { id: r.id, name: r.name, date: r.event_date ?? undefined, type: r.event_type ?? undefined, createdAt: r.created_at };
}

function parseReactions(json: string | null): Reactions {
  try {
    const v = JSON.parse(json ?? "{}") as unknown;
    return v && typeof v === "object" ? (v as Reactions) : {};
  } catch {
    return {};
  }
}

function toMemory(r: MemoryRow): Memory {
  return {
    id: r.id,
    folderId: r.folder_id,
    source: r.source,
    photoUrl: fileUrl(r.folder_id, r.photo_name),
    message: r.message ?? undefined,
    guestName: r.guest_name ?? undefined,
    reactions: parseReactions(r.reactions),
    voiceNoteUrl: r.voice_name ? fileUrl(r.folder_id, r.voice_name) : undefined,
    createdAt: r.created_at,
  };
}

/** Inserts memory rows in chunks (D1 allows up to 100 bound parameters per statement). */
async function insertMemories(rows: MemoryRow[]) {
  const cols = ["id", "folder_id", "source", "photo_name", "message", "guest_name", "reactions", "voice_name", "created_at"] as const;
  const per = Math.floor(100 / cols.length);
  for (let i = 0; i < rows.length; i += per) {
    const chunk = rows.slice(i, i + per);
    const placeholders = chunk.map(() => `(${cols.map(() => "?").join(", ")})`).join(", ");
    await d1(`INSERT INTO memories (${cols.join(", ")}) VALUES ${placeholders}`, chunk.flatMap((r) => cols.map((c) => r[c])));
  }
}

// ---- Folders -----------------------------------------------------------------

export async function listFolders(): Promise<FolderSummary[]> {
  const rows = await d1<SummaryRow>(`
    SELECT f.*,
      (SELECT count(*) FROM memories m WHERE m.folder_id = f.id) AS photo_count,
      (SELECT json_group_array(photo_name) FROM
        (SELECT photo_name FROM memories m WHERE m.folder_id = f.id ORDER BY created_at DESC LIMIT 2)) AS preview_names
    FROM memory_folders f
    ORDER BY f.created_at`);
  return rows.map((r) => ({
    ...toFolder(r),
    photoCount: Number(r.photo_count),
    previewUrls: (JSON.parse(r.preview_names ?? "[]") as string[]).map((n) => fileUrl(r.id, n)),
  }));
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  const [row] = await d1<FolderRow>("SELECT * FROM memory_folders WHERE id = ?", [id]);
  return row ? toFolder(row) : undefined;
}

export async function createFolder(input: Pick<Folder, "name" | "date" | "type">) {
  const [row] = await d1<FolderRow>(
    "INSERT INTO memory_folders (id, name, event_date, event_type, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *",
    [shortId(), input.name, input.date || null, input.type || null, new Date().toISOString()],
  );
  return toFolder(row);
}

// ---- Memories ----------------------------------------------------------------

export async function listMemories(folderId: string): Promise<Memory[]> {
  const rows = await d1<MemoryRow>("SELECT * FROM memories WHERE folder_id = ? ORDER BY created_at DESC", [folderId]);
  return rows.map(toMemory);
}

export async function addMemories(folderId: string, items: NewMemory[]) {
  if (!(await getFolder(folderId))) throw new Error("Folder not found");

  const uploaded: string[] = [];
  const upload = async (name: string, file: File) => {
    const path = `${folderId}/${name}`;
    await files().put(path, file, contentTypeFor(name));
    uploaded.push(path);
    return name;
  };

  try {
    const now = Date.now();
    const rows: MemoryRow[] = await Promise.all(
      items.map(async (item, i) => {
        const id = shortId();
        return {
          id,
          folder_id: folderId,
          source: item.source,
          photo_name: await upload(storedName(`${id}-photo`, item.photo.type), item.photo),
          message: item.message?.trim() || null,
          guest_name: item.guestName?.trim() || null,
          reactions: JSON.stringify(item.reactions ?? {}),
          voice_name: item.voiceNote ? await upload(storedName(`${id}-voice`, item.voiceNote.type), item.voiceNote) : null,
          // Keep submission order stable within one batch.
          created_at: new Date(now + i).toISOString(),
        };
      }),
    );
    await insertMemories(rows);
    return rows.map(toMemory);
  } catch (err) {
    // Don't leave orphaned files behind if any part of the batch failed.
    if (uploaded.length) await files().remove(uploaded).catch(() => undefined);
    throw err;
  }
}

export async function addReaction(memoryId: string, emoji: string) {
  // One UPDATE, so simultaneous reactions can't overwrite each other.
  const path = `$."${emoji}"`;
  const [row] = await d1<MemoryRow>(
    "UPDATE memories SET reactions = json_set(reactions, ?, coalesce(json_extract(reactions, ?), 0) + 1) WHERE id = ? RETURNING *",
    [path, path, memoryId],
  );
  if (!row) throw new Error("Memory not found");
  return toMemory(row);
}

/** Removes one memory: its files from R2 first, then the row. */
export async function deleteMemory(memoryId: string) {
  const [row] = await d1<Pick<MemoryRow, "folder_id" | "photo_name" | "voice_name">>(
    "SELECT folder_id, photo_name, voice_name FROM memories WHERE id = ?",
    [memoryId],
  );
  if (!row) return false;
  await files().remove([row.photo_name, row.voice_name].filter((n): n is string => !!n).map((n) => `${row.folder_id}/${n}`));
  await d1("DELETE FROM memories WHERE id = ?", [memoryId]);
  return true;
}

/** Removes a folder: every file under it in R2, its memories, then the folder. */
export async function deleteFolder(folderId: string) {
  if (!(await getFolder(folderId))) return false;
  await files().removeFolder(folderId);
  await d1("DELETE FROM memories WHERE folder_id = ?", [folderId]);
  await d1("DELETE FROM memory_folders WHERE id = ?", [folderId]);
  return true;
}

// ---- Direct browser uploads -------------------------------------------------
// Serverless hosts cap request bodies (~4.5 MB on Vercel), so in production the
// browser uploads each file straight to R2 with a one-time signed URL and
// then posts only the small JSON metadata.

export interface UploadPlan {
  id: string;
  photo: { name: string; url: string };
  voice?: { name: string; url: string };
}

export async function planUploads(folderId: string, requests: { photo: string; voice?: string }[]): Promise<UploadPlan[]> {
  // The browser must send exactly this Content-Type when it PUTs the file.
  const sign = async (name: string, type: string) => ({ name, url: await files().signedUploadUrl(`${folderId}/${name}`, type) });
  return Promise.all(
    requests.map(async (f) => {
      const id = shortId();
      return {
        id,
        photo: await sign(storedName(`${id}-photo`, f.photo), f.photo),
        voice: f.voice ? await sign(storedName(`${id}-voice`, f.voice), f.voice) : undefined,
      };
    }),
  );
}

export interface UploadedMemory {
  id: string;
  photoName: string;
  voiceName?: string;
  message?: string;
  reactions?: Reactions;
}

export async function addUploadedMemories(folderId: string, source: Memory["source"], guestName: string | undefined, items: UploadedMemory[]) {
  if (!(await getFolder(folderId))) throw new Error("Folder not found");

  // Only accept files we signed for this memory, and that actually arrived.
  for (const item of items) {
    const expected = [[item.photoName, "photo"], ...(item.voiceName ? [[item.voiceName, "voice"]] : [])];
    for (const [name, kind] of expected) {
      if (!name.startsWith(`${item.id}-${kind}.`) || !isSafeFileRef(folderId, name)) throw new Error("Invalid upload reference");
      if (!(await files().exists(`${folderId}/${name}`))) throw new Error("An upload didn't finish. Please try again.");
    }
  }

  const now = Date.now();
  const rows: MemoryRow[] = items.map((item, i) => ({
    id: item.id,
    folder_id: folderId,
    source,
    photo_name: item.photoName,
    message: item.message?.trim() || null,
    guest_name: guestName?.trim() || null,
    reactions: JSON.stringify(item.reactions ?? {}),
    voice_name: item.voiceName ?? null,
    created_at: new Date(now + i).toISOString(),
  }));
  await insertMemories(rows);
  return rows.map(toMemory);
}

// ---- Files -------------------------------------------------------------------

const SIGNED_URL_SECONDS = 60 * 60;

/** Sends the browser to a short-lived signed R2 URL instead of proxying bytes. */
export async function getFile(folderId: string, name: string): Promise<StoredFile | undefined> {
  if (!isSafeFileRef(folderId, name)) return undefined;
  const url = await files().signedReadUrl(`${folderId}/${name}`, SIGNED_URL_SECONDS);
  return url ? { redirect: url } : undefined;
}

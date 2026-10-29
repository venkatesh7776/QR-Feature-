import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Folder, FolderSummary, Memory, Reactions } from "../lib/types";
import { contentTypeFor, fileUrl, isSafeFileRef, shortId, storedName, type NewMemory, type StoredFile } from "./shared";

/**
 * Permanent persistence: records in Supabase Postgres, photos and voice notes
 * in a private Supabase Storage bucket. Schema: supabase/migrations.
 * Uses the service-role key, so this must only ever run on the server.
 */

const BUCKET = "memories";

export function isConfigured() {
  return !!(supabaseUrl() && serviceKey());
}

function supabaseUrl() {
  // Accept the project URL with or without the /rest/v1 suffix.
  return process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
}

let client: SupabaseClient | undefined;
function db() {
  client ??= createClient(supabaseUrl()!, serviceKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

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
  preview_names: string[] | null;
}

interface MemoryRow {
  id: string;
  folder_id: string;
  source: Memory["source"];
  photo_name: string;
  message: string | null;
  guest_name: string | null;
  reactions: Reactions | null;
  voice_name: string | null;
  created_at: string;
}

function toFolder(r: FolderRow): Folder {
  return {
    id: r.id,
    name: r.name,
    date: r.event_date ?? undefined,
    type: r.event_type ?? undefined,
    createdAt: r.created_at,
  };
}

function toMemory(r: MemoryRow): Memory {
  return {
    id: r.id,
    folderId: r.folder_id,
    source: r.source,
    photoUrl: fileUrl(r.folder_id, r.photo_name),
    message: r.message ?? undefined,
    guestName: r.guest_name ?? undefined,
    reactions: r.reactions ?? {},
    voiceNoteUrl: r.voice_name ? fileUrl(r.folder_id, r.voice_name) : undefined,
    createdAt: r.created_at,
  };
}

function check<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data as T;
}

// ---- Folders -----------------------------------------------------------------

export async function listFolders(): Promise<FolderSummary[]> {
  const rows = check<SummaryRow[]>(
    await db().from("memory_folder_summaries").select("*").order("created_at"),
  );
  return rows.map((r) => ({
    ...toFolder(r),
    photoCount: Number(r.photo_count),
    previewUrls: (r.preview_names ?? []).map((n) => fileUrl(r.id, n)),
  }));
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  const row = check<FolderRow | null>(
    await db().from("memory_folders").select("*").eq("id", id).maybeSingle(),
  );
  return row ? toFolder(row) : undefined;
}

export async function createFolder(input: Pick<Folder, "name" | "date" | "type">) {
  const row = check<FolderRow>(
    await db()
      .from("memory_folders")
      .insert({
        id: shortId(),
        name: input.name,
        event_date: input.date || null,
        event_type: input.type || null,
      })
      .select()
      .single(),
  );
  return toFolder(row);
}

// ---- Memories ----------------------------------------------------------------

export async function listMemories(folderId: string): Promise<Memory[]> {
  const rows = check<MemoryRow[]>(
    await db()
      .from("memories")
      .select("*")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false }),
  );
  return rows.map(toMemory);
}

export async function addMemories(folderId: string, items: NewMemory[]) {
  if (!(await getFolder(folderId))) throw new Error("Folder not found");

  const uploaded: string[] = [];
  const upload = async (name: string, file: File) => {
    const path = `${folderId}/${name}`;
    check(
      await db().storage.from(BUCKET).upload(path, file, {
        contentType: contentTypeFor(name),
        upsert: false,
      }),
    );
    uploaded.push(path);
    return name;
  };

  try {
    const now = Date.now();
    const rows = await Promise.all(
      items.map(async (item, i) => {
        const id = shortId();
        return {
          id,
          folder_id: folderId,
          source: item.source,
          photo_name: await upload(storedName(`${id}-photo`, item.photo.type), item.photo),
          message: item.message?.trim() || null,
          guest_name: item.guestName?.trim() || null,
          reactions: item.reactions ?? {},
          voice_name: item.voiceNote
            ? await upload(storedName(`${id}-voice`, item.voiceNote.type), item.voiceNote)
            : null,
          // Keep submission order stable within one batch.
          created_at: new Date(now + i).toISOString(),
        };
      }),
    );
    const saved = check<MemoryRow[]>(await db().from("memories").insert(rows).select());
    return saved.map(toMemory);
  } catch (err) {
    // Don't leave orphaned files behind if any part of the batch failed.
    if (uploaded.length) await db().storage.from(BUCKET).remove(uploaded);
    throw err;
  }
}

export async function addReaction(memoryId: string, emoji: string) {
  // Done in SQL so simultaneous reactions can't overwrite each other.
  const row = check<MemoryRow | null>(
    await db()
      .rpc("increment_memory_reaction", { p_memory_id: memoryId, p_emoji: emoji })
      .maybeSingle(),
  );
  if (!row) throw new Error("Memory not found");
  return toMemory(row);
}

// ---- Direct browser uploads -------------------------------------------------
// Serverless hosts cap request bodies (~4.5 MB on Vercel), so in production the
// browser uploads each file straight to Storage with a one-time signed URL and
// then posts only the small JSON metadata.

export interface UploadPlan {
  id: string;
  photo: { name: string; url: string };
  voice?: { name: string; url: string };
}

export async function planUploads(
  folderId: string,
  files: { photo: string; voice?: string }[],
): Promise<UploadPlan[]> {
  const sign = async (name: string) => {
    const { signedUrl } = check(
      await db().storage.from(BUCKET).createSignedUploadUrl(`${folderId}/${name}`),
    );
    return { name, url: signedUrl };
  };
  return Promise.all(
    files.map(async (f) => {
      const id = shortId();
      return {
        id,
        photo: await sign(storedName(`${id}-photo`, f.photo)),
        voice: f.voice ? await sign(storedName(`${id}-voice`, f.voice)) : undefined,
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

export async function addUploadedMemories(
  folderId: string,
  source: Memory["source"],
  guestName: string | undefined,
  items: UploadedMemory[],
) {
  if (!(await getFolder(folderId))) throw new Error("Folder not found");

  // Only accept files we signed for this memory, and that actually arrived.
  for (const item of items) {
    const expected = [[item.photoName, "photo"], ...(item.voiceName ? [[item.voiceName, "voice"]] : [])];
    for (const [name, kind] of expected) {
      if (!name.startsWith(`${item.id}-${kind}.`) || !isSafeFileRef(folderId, name)) {
        throw new Error("Invalid upload reference");
      }
      const { data: found } = await db().storage.from(BUCKET).exists(`${folderId}/${name}`);
      if (!found) throw new Error("An upload didn't finish. Please try again.");
    }
  }

  const now = Date.now();
  const saved = check<MemoryRow[]>(
    await db()
      .from("memories")
      .insert(
        items.map((item, i) => ({
          id: item.id,
          folder_id: folderId,
          source,
          photo_name: item.photoName,
          message: item.message?.trim() || null,
          guest_name: guestName?.trim() || null,
          reactions: item.reactions ?? {},
          voice_name: item.voiceName ?? null,
          created_at: new Date(now + i).toISOString(),
        })),
      )
      .select(),
  );
  return saved.map(toMemory);
}

// ---- Files -------------------------------------------------------------------

const SIGNED_URL_SECONDS = 60 * 60;

/** Sends the browser to a short-lived signed URL instead of proxying bytes. */
export async function getFile(folderId: string, name: string): Promise<StoredFile | undefined> {
  if (!isSafeFileRef(folderId, name)) return undefined;
  const { data, error } = await db()
    .storage.from(BUCKET)
    .createSignedUrl(`${folderId}/${name}`, SIGNED_URL_SECONDS);
  if (error || !data) return undefined;
  return { redirect: data.signedUrl };
}

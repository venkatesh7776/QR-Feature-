import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Folder, FolderSummary, Memory } from "../lib/types";
import { contentTypeFor, fileUrl, isSafeFileRef, shortId, storedName, type NewMemory, type StoredFile } from "./shared";

/**
 * Local fallback persistence, used when Supabase isn't configured: one JSON
 * file for records plus a folder of uploaded files, both under `.data/`.
 * Data lives only on this machine.
 */

const DATA_DIR = process.env.MEMORIES_DATA_DIR ?? path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

interface Db {
  folders: Folder[];
  memories: Memory[];
}

// Serialise writes so concurrent guest submissions don't clobber each other.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readDb(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8")) as Db;
  } catch {
    return { folders: [], memories: [] };
  }
}

async function writeDb(db: Db) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_FILE);
}

// ---- Folders ---------------------------------------------------------------

export async function listFolders(): Promise<FolderSummary[]> {
  const db = await readDb();
  return db.folders
    .map((f) => {
      const photos = db.memories.filter((m) => m.folderId === f.id);
      return {
        ...f,
        photoCount: photos.length,
        previewUrls: photos.slice(-2).reverse().map((m) => m.photoUrl),
      };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getFolder(id: string): Promise<Folder | undefined> {
  const db = await readDb();
  return db.folders.find((f) => f.id === id);
}

export function createFolder(input: Pick<Folder, "name" | "date" | "type">) {
  return exclusive(async () => {
    const db = await readDb();
    const folder: Folder = {
      id: shortId(),
      name: input.name,
      date: input.date || undefined,
      type: input.type || undefined,
      createdAt: new Date().toISOString(),
    };
    db.folders.push(folder);
    await writeDb(db);
    return folder;
  });
}

// ---- Memories --------------------------------------------------------------

export async function listMemories(folderId: string): Promise<Memory[]> {
  const db = await readDb();
  return db.memories
    .filter((m) => m.folderId === folderId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addMemories(folderId: string, items: NewMemory[]) {
  return exclusive(async () => {
    const db = await readDb();
    if (!db.folders.some((f) => f.id === folderId)) {
      throw new Error("Folder not found");
    }
    const now = Date.now();
    const created: Memory[] = [];
    for (const [i, item] of items.entries()) {
      const id = shortId();
      created.push({
        id,
        folderId,
        source: item.source,
        photoUrl: await saveFile(folderId, `${id}-photo`, item.photo),
        message: item.message?.trim() || undefined,
        guestName: item.guestName?.trim() || undefined,
        reactions: item.reactions ?? {},
        voiceNoteUrl: item.voiceNote
          ? await saveFile(folderId, `${id}-voice`, item.voiceNote)
          : undefined,
        // Keep submission order stable within one batch.
        createdAt: new Date(now + i).toISOString(),
      });
    }
    db.memories.push(...created);
    await writeDb(db);
    return created;
  });
}

export function addReaction(memoryId: string, emoji: string) {
  return exclusive(async () => {
    const db = await readDb();
    const memory = db.memories.find((m) => m.id === memoryId);
    if (!memory) throw new Error("Memory not found");
    memory.reactions[emoji] = (memory.reactions[emoji] ?? 0) + 1;
    await writeDb(db);
    return memory;
  });
}

// ---- Files -----------------------------------------------------------------

async function saveFile(folderId: string, base: string, file: File) {
  const dir = path.join(UPLOAD_DIR, folderId);
  await fs.mkdir(dir, { recursive: true });
  const name = storedName(base, file.type);
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return fileUrl(folderId, name);
}

export async function getFile(folderId: string, name: string): Promise<StoredFile | undefined> {
  if (!isSafeFileRef(folderId, name)) return undefined;
  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, folderId, name));
    return { data, contentType: contentTypeFor(name) };
  } catch {
    return undefined;
  }
}

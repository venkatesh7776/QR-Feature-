// One-time copy of the local demo data (.data/) into Supabase.
// Safe to re-run: existing rows/files are skipped.
// Usage: npm run migrate:supabase
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const url = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const dataDir = process.env.MEMORIES_DATA_DIR ?? path.join(process.cwd(), ".data");
const dbFile = path.join(dataDir, "db.json");
if (!existsSync(dbFile)) {
  console.log("No local data to migrate.");
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { folders, memories } = JSON.parse(readFileSync(dbFile, "utf8"));
const nameOf = (fileUrl) => fileUrl?.split("/").pop();
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic",
  webm: "audio/webm", ogg: "audio/ogg", m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac" };

async function uploadFile(folderId, name) {
  const file = path.join(dataDir, "uploads", folderId, name);
  if (!existsSync(file)) return console.warn(`  missing file ${folderId}/${name}`);
  const { error } = await supabase.storage.from("memories").upload(`${folderId}/${name}`, readFileSync(file), {
    contentType: TYPES[name.split(".").pop()] ?? "application/octet-stream",
    upsert: false,
  });
  if (error && !/exists/i.test(error.message)) throw new Error(`${name}: ${error.message}`);
}

const { error: folderError } = await supabase.from("memory_folders").upsert(
  folders.map((f) => ({ id: f.id, name: f.name, event_date: f.date ?? null, event_type: f.type ?? null, created_at: f.createdAt })),
  { onConflict: "id", ignoreDuplicates: true },
);
if (folderError) throw new Error(folderError.message);
console.log(`Folders: ${folders.length}`);

for (const m of memories) {
  await uploadFile(m.folderId, nameOf(m.photoUrl));
  if (m.voiceNoteUrl) await uploadFile(m.folderId, nameOf(m.voiceNoteUrl));
}
const { error: memoryError } = await supabase.from("memories").upsert(
  memories.map((m) => ({
    id: m.id, folder_id: m.folderId, source: m.source, photo_name: nameOf(m.photoUrl),
    message: m.message ?? null, guest_name: m.guestName ?? null, reactions: m.reactions ?? {},
    voice_name: nameOf(m.voiceNoteUrl) ?? null, created_at: m.createdAt,
  })),
  { onConflict: "id", ignoreDuplicates: true },
);
if (memoryError) throw new Error(memoryError.message);
console.log(`Memories: ${memories.length} (with their photos and voice notes)`);
console.log("Done. The local .data/ folder was left untouched as a backup.");

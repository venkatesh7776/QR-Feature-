// One-time copy of the photos and voice notes the albums use, from Supabase
// Storage (bucket "memories") to Cloudflare R2, keeping the same <folderId>/<name> paths so
// the records in Postgres need no changes. Safe to re-run: files already in
// R2 are skipped, and files of deleted photos are never copied back.
// Nothing is deleted from Supabase.
// Usage: npm run migrate:r2
import { createClient } from "@supabase/supabase-js";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const need = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];
const missing = need.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}

const url = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
const sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const Bucket = process.env.R2_BUCKET;

async function r2Size(Key) {
  try {
    return (await r2.send(new HeadObjectCommand({ Bucket, Key }))).ContentLength;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404) return undefined;
    throw err;
  }
}

// Copy only files the database still refers to. Supabase Storage keeps backup
// copies of photos that were later deleted in the app; those must not return.
const { data: rows, error: rowsError } = await sb.from("memories").select("folder_id, photo_name, voice_name");
if (rowsError) throw new Error(rowsError.message);
const keys = rows.flatMap((r) => [r.photo_name, r.voice_name].filter(Boolean).map((n) => `${r.folder_id}/${n}`));

let copied = 0, skipped = 0, bytes = 0;
const failures = [];
for (const Key of keys) {
  try {
    if ((await r2Size(Key)) !== undefined) { skipped++; continue; }
    const { data, error } = await sb.storage.from("memories").download(Key);
    if (error) throw new Error(error.message);
    const body = new Uint8Array(await data.arrayBuffer());
    await r2.send(new PutObjectCommand({ Bucket, Key, Body: body, ContentType: data.type || undefined }));
    copied++; bytes += body.length;
    process.stdout.write(".");
  } catch (err) {
    failures.push(`${Key}: ${err.message}`);
  }
}
console.log(`\nFiles in albums: ${keys.length} · copied ${copied} (${(bytes / 1048576).toFixed(1)} MB) · already in R2: ${skipped} · failed: ${failures.length}`);
failures.forEach((f) => console.log("  ✗ " + f));
process.exit(failures.length ? 1 : 0);

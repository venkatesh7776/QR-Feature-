// One-time copy of every photo and voice note from Supabase Storage (bucket
// "memories") to Cloudflare R2, keeping the same <folderId>/<name> paths so
// the records in Postgres need no changes. Safe to re-run: files already in
// R2 with the same size are skipped. Nothing is deleted from Supabase.
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

async function listAll(prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb.storage.from("memories").list(prefix, { limit: 1000, offset });
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

const folders = (await listAll("")).filter((e) => !e.metadata); // top-level entries without metadata are folders
let copied = 0, skipped = 0, bytes = 0;
const failures = [];
for (const folder of folders) {
  for (const file of await listAll(folder.name)) {
    if (!file.metadata) continue;
    const Key = `${folder.name}/${file.name}`;
    try {
      const size = file.metadata.size;
      if ((await r2Size(Key)) === size) { skipped++; continue; }
      const { data, error } = await sb.storage.from("memories").download(Key);
      if (error) throw new Error(error.message);
      const body = new Uint8Array(await data.arrayBuffer());
      await r2.send(new PutObjectCommand({ Bucket, Key, Body: body, ContentType: file.metadata.mimetype }));
      copied++; bytes += body.length;
      process.stdout.write(".");
    } catch (err) {
      failures.push(`${Key}: ${err.message}`);
    }
  }
}
console.log(`\nFolders: ${folders.length} · copied ${copied} files (${(bytes / 1048576).toFixed(1)} MB) · already in R2: ${skipped} · failed: ${failures.length}`);
failures.forEach((f) => console.log("  ✗ " + f));
process.exit(failures.length ? 1 : 0);

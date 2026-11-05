import "server-only";
import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Photos and voice notes in Cloudflare R2, through its S3-compatible API:
 * a private bucket, presigned upload and download URLs. Configured by
 * R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.
 *
 * Paths are always `<folderId>/<file name>`.
 */
export interface FileStore {
  kind: "r2";
  /** Server-side upload (multipart submissions). */
  put(path: string, body: Blob, contentType: string): Promise<void>;
  /** One-time URL the browser PUTs the file to, with this exact Content-Type. */
  signedUploadUrl(path: string, contentType: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  /** Short-lived URL the browser is redirected to for viewing. */
  signedReadUrl(path: string, seconds: number): Promise<string | undefined>;
  remove(paths: string[]): Promise<void>;
  /** Removes every file under `<prefix>/`. */
  removeFolder(prefix: string): Promise<void>;
}

const UPLOAD_URL_SECONDS = 15 * 60;

export function r2Configured() {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);
}

let s3: S3Client | undefined;
function r2Client() {
  s3 ??= new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  });
  return s3;
}

export function r2Files(): FileStore {
  const Bucket = process.env.R2_BUCKET!;
  const client = r2Client();
  return {
    kind: "r2",
    async put(path, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket, Key: path, Body: new Uint8Array(await body.arrayBuffer()), ContentType: contentType }));
    },
    signedUploadUrl(path, contentType) {
      return getSignedUrl(client, new PutObjectCommand({ Bucket, Key: path, ContentType: contentType }), { expiresIn: UPLOAD_URL_SECONDS });
    },
    async exists(path) {
      try {
        await client.send(new HeadObjectCommand({ Bucket, Key: path }));
        return true;
      } catch (err) {
        if ((err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
        throw err;
      }
    },
    signedReadUrl(path, seconds) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket, Key: path }), { expiresIn: seconds });
    },
    async remove(paths) {
      if (!paths.length) return;
      await client.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: paths.map((Key) => ({ Key })), Quiet: true } }));
    },
    async removeFolder(prefix) {
      // Listing returns at most 1,000 keys per page.
      for (;;) {
        const page = await client.send(new ListObjectsV2Command({ Bucket, Prefix: `${prefix}/`, MaxKeys: 1000 }));
        const keys = (page.Contents ?? []).map((o) => o.Key!).filter(Boolean);
        if (!keys.length) break;
        await this.remove(keys);
        if (!page.IsTruncated) break;
      }
    },
  };
}

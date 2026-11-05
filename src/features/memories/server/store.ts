import "server-only";
import * as cloud from "./cloud-store";
import * as local from "./local-store";

/**
 * The storage backend for Wedding Memories: Cloudflare (D1 for records, R2 for
 * photos and voice notes) when its settings are present; otherwise local files
 * in `.data/`, which is handy for development.
 */
const useCloud = cloud.isConfigured();

if (!useCloud && process.env.VERCEL) {
  // Serverless disks are wiped between requests, so local storage would lose data.
  throw new Error("Wedding Memories: set the Cloudflare D1 and R2 settings on Vercel.");
}

const backend = useCloud ? cloud : local;

export const storageBackend = useCloud ? "cloudflare" : "local";

export const {
  listFolders,
  getFolder,
  createFolder,
  listMemories,
  addMemories,
  addReaction,
  deleteMemory,
  deleteFolder,
  getFile,
} = backend;

/** Cloudflare only: the browser uploads files directly to R2, then posts metadata. */
export const directUploads = useCloud;
export const { planUploads, addUploadedMemories } = cloud;

export type { NewMemory, StoredFile } from "./shared";
export type { UploadPlan, UploadedMemory } from "./cloud-store";

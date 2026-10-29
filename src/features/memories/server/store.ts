import "server-only";
import * as local from "./local-store";
import * as supabase from "./supabase-store";

/**
 * The storage backend for Wedding Memories. Supabase (permanent, shared) when
 * SUPABASE_URL and a service key are set; otherwise local files in `.data/`.
 */
const useSupabase = supabase.isConfigured();

if (!useSupabase && process.env.VERCEL) {
  // Serverless disks are wiped between requests, so local storage would lose data.
  throw new Error("Wedding Memories: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Vercel.");
}

const backend = useSupabase ? supabase : local;

export const storageBackend = useSupabase ? "supabase" : "local";

export const { listFolders, getFolder, createFolder, listMemories, addMemories, addReaction, getFile } =
  backend;

/** Supabase only: browser uploads files directly, then posts metadata. */
export const directUploads = useSupabase;
export const { planUploads, addUploadedMemories } = supabase;

export type { NewMemory, StoredFile } from "./shared";
export type { UploadPlan, UploadedMemory } from "./supabase-store";

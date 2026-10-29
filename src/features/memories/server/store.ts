import "server-only";
import * as local from "./local-store";
import * as supabase from "./supabase-store";

/**
 * The storage backend for Wedding Memories. Supabase (permanent, shared) when
 * SUPABASE_URL and a service key are set; otherwise local files in `.data/`.
 */
const backend = supabase.isConfigured() ? supabase : local;

export const storageBackend = backend === supabase ? "supabase" : "local";

export const { listFolders, getFolder, createFolder, listMemories, addMemories, addReaction, readFile } =
  backend;

export type { NewMemory } from "./shared";

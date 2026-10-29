import type { Folder, FolderSummary, Memory } from "./types";

/** Browser-side client for the memories API. */

const BASE = "/api/memories";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function fetchFolders() {
  return fetch(`${BASE}/folders`, { cache: "no-store" }).then((r) => json<FolderSummary[]>(r));
}

export function fetchFolder(id: string) {
  return fetch(`${BASE}/folders/${id}`, { cache: "no-store" }).then((r) =>
    json<{ folder: Folder; memories: Memory[] }>(r),
  );
}

export function createFolder(input: { name: string; date?: string; type?: string }) {
  return fetch(`${BASE}/folders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => json<Folder>(r));
}

export interface DraftMemory {
  photo: Blob;
  message?: string;
  reactions?: string[];
  voiceNote?: Blob;
}

export function submitMemories(
  folderId: string,
  source: "guest" | "couple",
  items: DraftMemory[],
  guestName?: string,
) {
  const form = new FormData();
  form.set("source", source);
  form.set("count", String(items.length));
  if (guestName) form.set("guestName", guestName);
  items.forEach((item, i) => {
    form.set(`photo.${i}`, item.photo, fileName("photo", item.photo));
    if (item.message) form.set(`message.${i}`, item.message);
    if (item.reactions?.length) form.set(`reactions.${i}`, JSON.stringify(item.reactions));
    if (item.voiceNote) form.set(`voice.${i}`, item.voiceNote, fileName("voice", item.voiceNote));
  });
  return fetch(`${BASE}/folders/${folderId}/memories`, { method: "POST", body: form }).then((r) =>
    json<{ memories: Memory[] }>(r),
  );
}

export function react(memoryId: string, emoji: string) {
  return fetch(`${BASE}/memories/${memoryId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  }).then((r) => json<Memory>(r));
}

export function fetchShareOrigin() {
  return fetch(`${BASE}/share-origin`, { cache: "no-store" })
    .then((r) => json<{ origin: string; kind: "public" | "current" | "lan" | "local" }>(r))
    .catch(() => ({ origin: window.location.origin, kind: "current" as const }));
}

export function guestPath(folderId: string) {
  return `/share/${folderId}`;
}

function fileName(base: string, blob: Blob) {
  return blob instanceof File ? blob.name : `${base}.${blob.type.split("/")[1]?.split(";")[0] ?? "bin"}`;
}

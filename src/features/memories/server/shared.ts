import "server-only";
import { randomUUID } from "node:crypto";
import type { Memory, Reactions } from "../lib/types";

/** Helpers shared by every storage backend, so they produce identical records. */

export interface NewMemory {
  source: Memory["source"];
  photo: File;
  message?: string;
  guestName?: string;
  reactions?: Reactions;
  voiceNote?: File;
}

export function shortId() {
  return randomUUID().replace(/-/g, "").slice(0, 10);
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "aac",
};

const CONTENT_TYPES = Object.fromEntries(
  Object.entries(EXTENSIONS).map(([type, ext]) => [ext, type]),
);

/** Stored file name for an upload, e.g. "a1b2c3-photo.jpg". */
export function storedName(base: string, contentType: string) {
  return `${base}.${EXTENSIONS[contentType.split(";")[0]] ?? "bin"}`;
}

/** A stored file: bytes we serve ourselves, or a URL to send the browser to. */
export type StoredFile = { data: Buffer; contentType: string } | { redirect: string };

export function contentTypeFor(name: string) {
  return CONTENT_TYPES[name.split(".").pop()!] ?? "application/octet-stream";
}

/** Files are always served through our API, whichever backend stores them. */
export function fileUrl(folderId: string, name: string) {
  return `/api/memories/files/${folderId}/${name}`;
}

/** Rejects anything that could escape a folder's own files. */
export function isSafeFileRef(folderId: string, name: string) {
  return /^[\w-]+$/.test(folderId) && /^[\w-]+\.\w+$/.test(name);
}

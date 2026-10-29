"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFolder, submitMemories } from "../lib/api";
import { formatDate, prepareImage } from "../lib/media";
import type { Folder, Memory } from "../lib/types";
import { MemoryViewer } from "./MemoryViewer";
import { Reactions } from "./Reactions";

const REFRESH_MS = 10_000;

export function FolderView({ folderId, justCreated }: { folderId: string; justCreated: boolean }) {
  const [folder, setFolder] = useState<Folder>();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [missing, setMissing] = useState(false);
  const [openId, setOpenId] = useState<string>();
  const [upload, setUpload] = useState<{ state: "busy" | "done" | "error"; text: string }>();
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchFolder(folderId);
      setFolder(data.folder);
      setMemories(data.memories);
    } catch {
      setMissing(true);
    }
  }, [folderId]);

  // Guests upload from their phones, so keep the gallery fresh.
  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  async function uploadOwn(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    const label = `${files.length} ${files.length === 1 ? "photo" : "photos"}`;
    setUpload({ state: "busy", text: `Uploading ${label}…` });
    try {
      const photos = await Promise.all(files.map((f) => prepareImage(f)));
      await submitMemories(folderId, "couple", photos.map((photo) => ({ photo })));
      await load();
      setUpload({ state: "done", text: `Added ${label} to this folder.` });
    } catch (err) {
      setUpload({ state: "error", text: `Upload failed: ${(err as Error).message}` });
    }
  }

  if (missing) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-10">
        <p className="font-serif text-4xl">This folder doesn&apos;t exist.</p>
        <Link href="/memories" className="link mt-6 inline-block">
          Back to all folders
        </Link>
      </main>
    );
  }

  if (!folder) return <main className="min-h-dvh" />;

  const guestCount = memories.filter((m) => m.source === "guest").length;
  // Track the open photo by id: background refreshes can prepend new memories.
  const openIndex = memories.findIndex((m) => m.id === openId);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 sm:px-10">
      <nav className="pt-8">
        <Link href="/memories" className="text-sm text-muted transition-colors hover:text-ink">
          ← All folders
        </Link>
      </nav>

      <header className="flex flex-col gap-8 border-b border-line pt-10 pb-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{[folder.type, formatDate(folder.date)].filter(Boolean).join(" · ") || "Event folder"}</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05] sm:text-6xl">{folder.name}</h1>
          <p className="mt-4 text-sm text-muted">
            {memories.length} {memories.length === 1 ? "memory" : "memories"}
            {memories.length > 0 && ` · ${guestCount} from guests · ${memories.length - guestCount} from you`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={uploadOwn} />
          <button className="btn" onClick={() => fileInput.current?.click()} disabled={upload?.state === "busy"}>
            Upload photos
          </button>
          <Link href={`/memories/${folder.id}/qr`} className="btn-ghost">
            QR code
          </Link>
        </div>
      </header>

      {justCreated && memories.length === 0 && (
        <section className="mt-10 flex flex-col gap-6 border border-ink p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="eyebrow text-ink">Folder created</p>
            <p className="mt-2 font-serif text-2xl">Next, make a QR code for {folder.name}.</p>
            <p className="mt-1 text-sm text-muted">
              Guests scan it, add their photos, and everything shows up in this folder.
            </p>
          </div>
          <Link href={`/memories/${folder.id}/qr`} className="btn shrink-0">
            Generate QR code
          </Link>
        </section>
      )}

      {upload && (
        <p role="status" className="mt-6 text-sm text-muted">
          {upload.text}
        </p>
      )}

      {memories.length === 0 ? (
        !justCreated && (
          <div className="py-24 text-center">
            <p className="font-serif text-3xl italic">No memories yet.</p>
            <p className="mt-3 text-sm text-muted">
              Share the QR code with guests, or upload your own photos.
            </p>
          </div>
        )
      ) : (
        <ul className="mt-10 columns-2 gap-4 sm:columns-3 sm:gap-6 lg:columns-4">
          {memories.map((m) => (
            <li key={m.id} className="mb-6 break-inside-avoid sm:mb-8">
              <button type="button" onClick={() => setOpenId(m.id)} className="group block w-full text-left">
                <div className="overflow-hidden bg-wash">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.photoUrl}
                    alt={m.message ?? `Photo in ${folder.name}`}
                    loading="lazy"
                    className="w-full transition duration-500 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="truncate">
                    {m.source === "couple" ? "You" : (m.guestName ?? "Guest")}
                    {m.message && " · note"}
                    {m.voiceNoteUrl && " · voice"}
                  </span>
                  <Reactions reactions={m.reactions} compact />
                </div>
                {m.message && (
                  <p className="mt-1 line-clamp-2 font-serif text-[17px] leading-snug italic">“{m.message}”</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {openIndex >= 0 && (
        <MemoryViewer
          memories={memories}
          index={openIndex}
          onIndexChange={(i) => setOpenId(memories[i].id)}
          onClose={() => setOpenId(undefined)}
          onUpdate={(updated) => setMemories((all) => all.map((m) => (m.id === updated.id ? updated : m)))}
        />
      )}
    </main>
  );
}

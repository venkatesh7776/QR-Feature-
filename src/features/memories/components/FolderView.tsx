"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { deleteFolder, deleteMemory, fetchFolder, submitMemories } from "../lib/api";
import { formatDate, prepareImage } from "../lib/media";
import type { Folder, Memory } from "../lib/types";
import { AlbumBar, ArrowRight, SoftNotice } from "./Chrome";
import { FadeImage } from "./FadeImage";
import { LotusDivider } from "./art/Ornaments";
import { MemoryViewer, credit } from "./MemoryViewer";
import { ConfirmDialog, TrashIcon } from "./Modal";

const REFRESH_MS = 10_000;

export function FolderView({ folderId, justCreated }: { folderId: string; justCreated: boolean }) {
  const [folder, setFolder] = useState<Folder>();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [missing, setMissing] = useState(false);
  const [openId, setOpenId] = useState<string>();
  const [upload, setUpload] = useState<{ state: "busy" | "done" | "error"; text: string }>();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [confirming, setConfirming] = useState<{ kind: "album" } | { kind: "photo"; memory: Memory }>();

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
      setUpload({ state: "done", text: `Added ${label} to this album.` });
    } catch (err) {
      setUpload({ state: "error", text: `Upload failed: ${(err as Error).message}` });
    }
  }

  async function removeAlbum() {
    await deleteFolder(folderId);
    router.push("/memories");
  }

  async function removePhoto(memory: Memory) {
    await deleteMemory(memory.id);
    const at = memories.findIndex((m) => m.id === memory.id);
    const rest = memories.filter((m) => m.id !== memory.id);
    setMemories(rest);
    // Keep the viewer open on the next photo, if the deleted one was showing.
    if (openId === memory.id) setOpenId(rest[Math.min(at, rest.length - 1)]?.id);
    setConfirming(undefined);
  }

  const back = { href: "/memories", label: "All Albums", short: "Albums" };

  if (missing) {
    return (
      <>
        <AlbumBar title="Album not found" back={back} />
        <main className="gutter py-20">
          <SoftNotice title="This album doesn't exist" icon="folder">
            <Link href="/memories" className="link">Back to all albums</Link>
          </SoftNotice>
        </main>
      </>
    );
  }

  if (!folder) return <main className="min-h-dvh" />;

  const guestCount = memories.filter((m) => m.source === "guest").length;
  // Track the open photo by id: background refreshes can prepend new memories.
  const openIndex = memories.findIndex((m) => m.id === openId);
  const date = formatDate(folder.date);

  return (
    <>
      <AlbumBar title={folder.name} back={back} />
      <main className="gutter pb-24">
        <div className="container-wide">
          <section className="rise-in py-10 text-center sm:py-14">
            {date && <p className="t-label text-[10px] text-gold">{date}</p>}
            <p className="t-lead mt-3 text-ink-muted">
              {memories.length === 0
                ? "Waiting for the first memory."
                : `${memories.length} ${memories.length === 1 ? "memory" : "memories"} · ${guestCount} from guests · ${memories.length - guestCount} from you`}
            </p>
            <LotusDivider className="mt-5" />
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={uploadOwn} />
              <button className="btn btn--maroon" onClick={() => fileInput.current?.click()} disabled={upload?.state === "busy"}>
                <UploadIcon /> Upload photos
              </button>
              <Link href={`/memories/${folder.id}/qr`} className="btn btn--ghost text-maroon">
                <QrIcon /> QR code
              </Link>
              <button className="btn btn--ghost text-maroon" onClick={() => setConfirming({ kind: "album" })}>
                <TrashIcon /> Delete album
              </button>
            </div>
            {upload && (
              <p role="status" className={`mt-4 text-sm ${upload.state === "error" ? "text-maroon" : "text-ink-muted"}`}>
                {upload.text}
              </p>
            )}
          </section>

          {justCreated && memories.length === 0 && (
            <section className="card fade-in mx-auto mb-10 flex max-w-2xl flex-col gap-6 p-6 shadow-[0_24px_50px_-28px_rgba(72,20,31,0.55)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="t-label text-[10px] text-gold">Album created</p>
                <p className="mt-2 font-display text-2xl leading-snug text-maroon">Next, make the QR code for {folder.name}.</p>
                <p className="mt-1 text-sm text-ink-muted">Guests scan it, add their photos, and every moment arrives in this album.</p>
              </div>
              <Link href={`/memories/${folder.id}/qr`} className="btn btn--gold shrink-0">
                Generate QR code <ArrowRight />
              </Link>
            </section>
          )}

          {memories.length === 0 ? (
            !justCreated && (
              <SoftNotice title="No photos in this album yet">
                <p>Share the QR code with your guests, or upload your own photos.</p>
              </SoftNotice>
            )
          ) : (
            <Masonry
              items={memories}
              render={(m, i) => (
                <div key={m.id} className="group/tile fade-in relative" style={{ animationDelay: `${Math.min(i, 12) * 50}ms` }}>
                  <button
                    type="button"
                    onClick={() => setOpenId(m.id)}
                    className="group relative block w-full overflow-hidden rounded-sm text-left ring-1 ring-gold/25 outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    aria-label={`Open photo ${i + 1} of ${memories.length} — ${credit(m)}${m.message ? `: “${m.message}”` : ""}`}
                  >
                    <FadeImage src={m.photoUrl} alt="" wrapperClassName="min-h-32" className="block h-auto w-full transition-transform duration-700 ease-[var(--ease-silk)] group-hover:scale-[1.03]" />
                    <TileBadges m={m} />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-burgundy/85 via-burgundy/40 to-transparent px-3 pt-10 pb-2.5">
                      {m.message && <span className="line-clamp-2 font-display text-[15px] leading-snug text-ivory italic">“{m.message}”</span>}
                      <span className="mt-0.5 block text-[11px] text-ivory/80">{credit(m)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming({ kind: "photo", memory: m })}
                    aria-label={`Delete photo ${i + 1} — ${credit(m)}`}
                    title="Delete photo"
                    className="absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full border border-gold/40 bg-burgundy/75 text-ivory backdrop-blur-sm transition hover:border-gold hover:bg-maroon focus-visible:opacity-100 sm:opacity-0 sm:group-hover/tile:opacity-100"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            />
          )}
        </div>
      </main>

      {openIndex >= 0 && (
        <MemoryViewer
          memories={memories}
          index={openIndex}
          onIndexChange={(i) => setOpenId(memories[i].id)}
          onClose={() => setOpenId(undefined)}
          onDelete={(m) => setConfirming({ kind: "photo", memory: m })}
          paused={!!confirming}
        />
      )}

      <ConfirmDialog
        open={confirming?.kind === "album"}
        title={`Delete the ${folder.name} album?`}
        confirmLabel="Delete album"
        onConfirm={removeAlbum}
        onClose={() => setConfirming(undefined)}
      >
        <p>
          This permanently removes {memories.length === 0 ? "the album" : `all ${memories.length} ${memories.length === 1 ? "photo" : "photos"}`}, with every note,
          reaction and voice note. Guests scanning this album&apos;s QR code will no longer be able to share photos.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirming?.kind === "photo"}
        title="Delete this photo?"
        confirmLabel="Delete photo"
        onConfirm={() => (confirming?.kind === "photo" ? removePhoto(confirming.memory) : Promise.resolve())}
        onClose={() => setConfirming(undefined)}
      >
        <p>
          {confirming?.kind === "photo" ? credit(confirming.memory) : ""}. Its note, reactions and voice note are removed too. This can&apos;t be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}

/**
 * Photos dealt across columns left to right (photo 1 in column 1, photo 2 in
 * column 2, …). CSS columns fill top-to-bottom and leave columns empty when
 * there are only a few photos; this uses every column at every width.
 */
function Masonry<T>({ items, render }: { items: T[]; render: (item: T, index: number) => React.ReactNode }) {
  const count = useColumnCount();
  const columns = Array.from({ length: count }, () => [] as [T, number][]);
  items.forEach((item, i) => columns[i % count].push([item, i]));
  return (
    <ul className="flex items-start gap-3 sm:gap-4" role="list">
      {columns.map((col, c) => (
        <li key={c} className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
          {col.map(([item, i]) => render(item, i))}
        </li>
      ))}
    </ul>
  );
}

/** 2 columns on phones, 3 on tablets, 4 on desktops. */
function useColumnCount() {
  const [count, setCount] = useState(2);
  useEffect(() => {
    const queries = [window.matchMedia("(min-width: 1024px)"), window.matchMedia("(min-width: 768px)")];
    const update = () => setCount(queries[0].matches ? 4 : queries[1].matches ? 3 : 2);
    update();
    queries.forEach((q) => q.addEventListener("change", update));
    return () => queries.forEach((q) => q.removeEventListener("change", update));
  }, []);
  return count;
}

/** Small chips on a tile: a note, a voice note, and the reactions guests gave. */
function TileBadges({ m }: { m: Memory }) {
  const reactions = Object.entries(m.reactions).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (!m.message && !m.voiceNoteUrl && !reactions.length) return null;
  const chip = "flex h-7 items-center gap-1 rounded-full bg-burgundy/75 px-2 text-[12px] text-ivory backdrop-blur-sm";
  return (
    <span className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1.5">
      {m.message && (
        <span className={chip} title="Has a note">
          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.3}>
            <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" />
          </svg>
        </span>
      )}
      {m.voiceNoteUrl && (
        <span className={chip} title="Has a voice note">
          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.3}>
            <rect x="6" y="2" width="4" height="8" rx="2" />
            <path d="M3.5 8a4.5 4.5 0 0 0 9 0M8 12.5V14" />
          </svg>
        </span>
      )}
      {reactions.length > 0 && (
        <span className={chip}>
          {reactions.slice(0, 3).map(([e]) => (
            <span key={e} className="leading-none">{e}</span>
          ))}
          <span className="ml-0.5 text-ivory/80 tabular-nums">{reactions.reduce((n, [, c]) => n + c, 0)}</span>
        </span>
      )}
    </span>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 11V2M4.5 5.5 8 2l3.5 3.5M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.3}>
      <rect x="2" y="2" width="4.5" height="4.5" />
      <rect x="9.5" y="2" width="4.5" height="4.5" />
      <rect x="2" y="9.5" width="4.5" height="4.5" />
      <path d="M9.5 9.5h2v2h-2zM12 12h2v2h-2zM12 9.5h2M9.5 12v2" />
    </svg>
  );
}

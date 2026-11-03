"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createFolder, fetchFolders } from "../lib/api";
import { formatDate } from "../lib/media";
import type { FolderSummary } from "../lib/types";
import { wedding } from "../lib/wedding";
import { KolamTexture, Mandala, ZariBand } from "./art/Ornaments";
import { WeddingHeader, SoftNotice } from "./Chrome";
import { FadeImage } from "./FadeImage";
import { CloseButton, Modal } from "./Modal";

const photoLabel = (n: number) => (n === 0 ? "No photos yet" : `${n} ${n === 1 ? "photo" : "photos"}`);

export function Dashboard() {
  const [folders, setFolders] = useState<FolderSummary[]>();
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchFolders().then(setFolders, (e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <WeddingHeader eyebrow="Every Moment, A Memory" title="Your Wedding Memories">
        <p className="t-lead mx-auto mt-6 max-w-md text-ivory/70">
          One album for each celebration. Every album has its own QR code, and the moments guests share arrive here.
        </p>
        <button className="btn btn--gold mt-8" onClick={() => setCreating(true)}>
          Create Event Folder
        </button>
      </WeddingHeader>

      <main className="gutter pt-[clamp(3.5rem,2.5rem+4vw,6rem)] pb-24">
        <div className="container-wide">
          {error && <p className="text-center text-ink-muted">Couldn&apos;t load the albums: {error}</p>}

          {folders && folders.length === 0 && (
            <SoftNotice title="No albums yet" icon="folder">
              <p>Create an album for each celebration — {wedding.events.map((e) => e.name).join(", ")}.</p>
              <button className="btn btn--maroon mt-7" onClick={() => setCreating(true)}>
                Create your first folder
              </button>
            </SoftNotice>
          )}

          {folders && folders.length > 0 && (
            <>
              <p className="t-label mb-8 text-center text-[10px] text-gold">
                {folders.length} {folders.length === 1 ? "album" : "albums"}
              </p>
              <ul className="grid grid-cols-2 justify-start gap-x-4 gap-y-8 sm:grid-cols-[repeat(auto-fill,minmax(15rem,17.5rem))] sm:justify-center sm:gap-x-8 sm:gap-y-10">
                {folders.map((f, i) => (
                  <li key={f.id} className="fade-in" style={{ animationDelay: `${Math.min(i, 6) * 90}ms` }}>
                    <FolderCard f={f} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>

      <CreateFolderDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

/** A paper print peeking out of the folder. */
function Print({ src, className }: { src?: string; className: string }) {
  return (
    <span className={`absolute block bg-ivory p-[3%] shadow-[0_10px_22px_-10px_rgba(0,0,0,0.55)] transition-transform duration-500 ease-[var(--ease-silk)] ${className}`}>
      {src ? (
        <FadeImage src={src} alt="" wrapperClassName="h-full w-full" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-gradient-to-b from-ivory to-ivory-deep">
          <svg aria-hidden viewBox="0 0 48 48" className="h-8 w-8 text-gold/70" fill="none" stroke="currentColor" strokeWidth={1.2}>
            <path d="M6 16a3 3 0 0 1 3-3h5l3-4h14l3 4h5a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" />
            <circle cx="24" cy="25" r="7" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Sand folder with prints peeking out and a cream pocket, as on the invitation's memories page. */
function FolderCard({ f }: { f: FolderSummary }) {
  const date = formatDate(f.date);
  const [latest, previous] = f.previewUrls;

  return (
    <Link
      href={`/memories/${f.id}`}
      aria-label={`${f.name} — ${photoLabel(f.photoCount)}${date ? `, ${date}` : ""}`}
      className="group relative block aspect-[5/4.4] w-full outline-none focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-gold"
    >
      {/* back panel + tab: warm sand, with the faintest kolam */}
      <span aria-hidden className="absolute top-0 left-0 h-[16%] w-[44%] overflow-hidden rounded-t-[12px] bg-[#dcc8a3]" />
      <span aria-hidden className="absolute inset-x-0 top-[10%] bottom-0 overflow-hidden rounded-[12px] rounded-tl-none bg-[linear-gradient(165deg,#dcc8a3,#cdb68c)] shadow-[0_18px_36px_-24px_rgba(72,20,31,0.45)]">
        <KolamTexture className="opacity-[0.22]" id={`kolam-back-${f.id}`} />
      </span>

      {/* the latest photos, tucked inside */}
      <span aria-hidden className="absolute inset-x-[9%] top-[15%] h-[50%]">
        {previous && <Print src={previous} className="inset-y-0 right-0 left-[18%] rotate-[5deg] group-hover:-translate-y-[10%] group-hover:rotate-[8deg]" />}
        <Print src={latest} className="inset-y-0 right-[14%] left-0 -rotate-[2.5deg] group-hover:-translate-y-[16%] group-hover:-rotate-[4deg]" />
      </span>

      {/* front pocket: cream paper, one fine zari line and a whisper of mandala */}
      <span className="absolute inset-x-0 bottom-0 h-[60%] overflow-hidden rounded-[12px] border border-[#d9c49d] bg-[linear-gradient(180deg,#f7efe0,#efe3cb)] shadow-[0_-8px_18px_-12px_rgba(72,20,31,0.3)] transition-transform duration-500 ease-[var(--ease-silk)] group-hover:translate-y-[2%]">
        <ZariBand id={`zari-top-${f.id}`} className="top-[9%] opacity-55" />
        <Mandala className="pointer-events-none absolute -right-[20%] -bottom-[40%] w-[64%] text-maroon opacity-[0.05] transition-transform duration-[1.4s] ease-[var(--ease-silk)] group-hover:rotate-[20deg]" />
        <span className="absolute inset-x-[9%] bottom-[12%] text-left sm:pr-10">
          <span className="line-clamp-2 block font-display text-[clamp(1.05rem,0.95rem+0.6vw,1.45rem)] leading-[1.1] text-maroon">{f.name}</span>
          <span className="t-label mt-1.5 block text-[8px] leading-relaxed text-[#9a7535] sm:text-[9px]">
            {photoLabel(f.photoCount)}
            {date && <span className="text-ink-muted"> · {date}</span>}
          </span>
        </span>
        <span aria-hidden className="absolute right-[8%] bottom-[14%] hidden h-8 w-8 place-items-center rounded-full border border-maroon/30 text-maroon transition-colors duration-300 group-hover:border-maroon group-hover:bg-maroon group-hover:text-ivory sm:grid">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.4}>
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </span>
      </span>
    </Link>
  );
}

function CreateFolderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the folder a name.");
    setSaving(true);
    setError(undefined);
    try {
      const folder = await createFolder({ name, date: date || undefined });
      router.push(`/memories/${folder.id}?created=1`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} label="Create event folder" className="sm:max-w-lg">
      <form onSubmit={submit} className="p-6 sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="t-label text-[10px] text-gold">New album</p>
            <h2 className="t-h3 mt-2 !text-[2rem]">Create Event Folder</h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <label className="mt-9 block">
          <span className="t-label text-[10px] text-gold">Event name</span>
          <input
            autoFocus
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Reception"
            className="field mt-1 font-display text-2xl text-maroon"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {wedding.events.map((ev) => (
            <button
              key={ev.name}
              type="button"
              onClick={() => {
                setName(ev.name);
                setDate(ev.date);
              }}
              className={`min-h-9 rounded-full border px-3.5 text-[13px] transition-colors ${
                name === ev.name ? "border-maroon bg-maroon text-ivory" : "border-gold/50 text-maroon hover:border-maroon"
              }`}
            >
              {ev.name}
            </button>
          ))}
        </div>

        <label className="mt-8 block">
          <span className="t-label text-[10px] text-gold">Date (optional)</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field mt-1" />
        </label>

        {error && <p className="mt-6 text-sm text-maroon">{error}</p>}

        <div className="mt-10 flex gap-3">
          <button type="submit" className="btn btn--maroon flex-1" disabled={saving}>
            {saving ? "Creating…" : "Create folder"}
          </button>
          <button type="button" className="btn btn--ghost text-maroon" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

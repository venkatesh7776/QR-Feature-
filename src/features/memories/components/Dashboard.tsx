"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createFolder, fetchFolders } from "../lib/api";
import { formatDate } from "../lib/media";
import type { FolderSummary } from "../lib/types";
import { CloseButton, Modal } from "./Modal";

export function Dashboard() {
  const [folders, setFolders] = useState<FolderSummary[]>();
  const [error, setError] = useState<string>();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchFolders().then(setFolders, (e: Error) => setError(e.message));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 sm:px-10">
      <header className="flex flex-col gap-8 border-b border-line pt-16 pb-10 sm:flex-row sm:items-end sm:justify-between sm:pt-24">
        <div>
          <p className="eyebrow">Wedding Memories</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.05] sm:text-6xl">Your Wedding Memories</h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
            One folder for each event. Every folder gets its own QR code, and whatever guests share
            lands right back here.
          </p>
        </div>
        <button className="btn self-start sm:self-auto" onClick={() => setCreating(true)}>
          Create Event Folder
        </button>
      </header>

      {error && <p className="mt-10 text-sm text-muted">Couldn&apos;t load folders: {error}</p>}

      {folders && folders.length === 0 && (
        <div className="py-24 text-center">
          <p className="font-serif text-3xl italic">Nothing here yet.</p>
          <p className="mt-3 text-sm text-muted">
            Start with an event, like the Mehendi, the ceremony or the reception.
          </p>
          <button className="btn-ghost mt-8" onClick={() => setCreating(true)}>
            Create your first folder
          </button>
        </div>
      )}

      {folders && folders.length > 0 && (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 pt-10 sm:gap-x-8 sm:gap-y-12 sm:pt-12 lg:grid-cols-3">
          {folders.map((f) => (
            <li key={f.id}>
              <FolderCard folder={f} />
            </li>
          ))}
        </ul>
      )}

      <CreateFolderDialog open={creating} onClose={() => setCreating(false)} />
    </main>
  );
}

function FolderCard({ folder }: { folder: FolderSummary }) {
  const meta = [
    folder.type,
    `${folder.photoCount} ${folder.photoCount === 1 ? "photo" : "photos"}`,
    formatDate(folder.date),
  ].filter(Boolean);
  const [front, back] = folder.previewUrls;

  return (
    <Link href={`/memories/${folder.id}`} className="group block [perspective:900px]" aria-label={`Open ${folder.name}`}>
      <div className="relative aspect-[5/4]">
        {/* Back of the folder, with its tab */}
        <div className="absolute top-0 left-0 h-[12%] w-[42%] rounded-t-[10px] bg-[#dcdcd8]" />
        <div className="absolute inset-x-0 top-[8%] bottom-0 rounded-[10px] rounded-tl-none bg-[#dcdcd8]" />

        {/* Photos tucked inside */}
        {back && <Sheet src={back} className="left-[14%] right-[8%] rotate-[3deg] group-hover:-translate-y-4" />}
        <Sheet src={front} className="left-[8%] right-[14%] -rotate-[1.5deg] group-hover:-translate-y-6" />

        {/* Front flap with the folder's name */}
        <div className="absolute inset-x-0 bottom-0 flex h-[66%] origin-bottom flex-col justify-end rounded-[10px] border-t border-white/70 bg-[#ececea] p-3.5 transition-transform duration-500 ease-out group-hover:[transform:rotateX(-18deg)] sm:p-6">
          <h2 className="line-clamp-2 font-serif text-xl leading-[1.05] break-words sm:text-[30px]">{folder.name}</h2>
          <p className="mt-1 truncate text-xs text-muted sm:mt-2 sm:text-[13px]">{meta.join(" · ")}</p>
        </div>
      </div>
    </Link>
  );
}

function Sheet({ src, className }: { src?: string; className: string }) {
  return (
    <div
      className={`absolute top-[16%] bottom-[30%] overflow-hidden border-[3px] border-white bg-white sm:border-[5px] shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform duration-500 ease-out ${className}`}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      )}
    </div>
  );
}

const SUGGESTIONS = ["Mehendi", "Haldi", "Sangeet", "Wedding Ceremony", "Reception"];

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
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">New folder</p>
            <h2 className="mt-3 font-serif text-4xl">Create Event Folder</h2>
          </div>
          <div className="-mt-1 -mr-2">
            <CloseButton onClick={onClose} />
          </div>
        </div>

        <label className="mt-10 block">
          <span className="eyebrow">Event name</span>
          <input
            autoFocus
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wedding Ceremony"
            className="field mt-1 font-serif text-2xl"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setName(s)}
              className="border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-ink hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>

        <label className="mt-8 block">
          <span className="eyebrow">Date (optional)</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field mt-1" />
        </label>

        {error && <p className="mt-6 text-sm text-muted">{error}</p>}

        <div className="mt-10 flex gap-3">
          <button type="submit" className="btn flex-1" disabled={saving}>
            {saving ? "Creating…" : "Create folder"}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

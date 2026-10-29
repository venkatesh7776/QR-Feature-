"use client";

import { useEffect, useRef, useState } from "react";
import { fetchFolder, submitMemories } from "../lib/api";
import { prepareImage } from "../lib/media";
import { QUICK_REACTIONS } from "../lib/emoji";
import type { Folder } from "../lib/types";
import { EmojiPicker } from "./EmojiPicker";
import { VoiceNoteInput } from "./VoiceNoteInput";

const MAX_PHOTOS = 30;

// Not crypto.randomUUID(): it only exists on https/localhost, and guests open
// the demo over plain http on the LAN.
let draftSeq = 0;

interface Draft {
  key: string;
  file: File;
  preview: string;
  message: string;
  reactions: string[];
  voiceNote?: Blob;
}

type Phase = "compose" | "sending" | "sent";

export function GuestUpload({ folderId }: { folderId: string }) {
  const [folder, setFolder] = useState<Folder | null>();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("compose");
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState<string>();
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFolder(folderId).then(({ folder }) => setFolder(folder), () => setFolder(null));
  }, [folderId]);

  // Free preview memory when drafts are dropped.
  const previews = useRef(new Set<string>());
  useEffect(() => () => previews.current.forEach(URL.revokeObjectURL), []);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    const room = MAX_PHOTOS - drafts.length;
    if (files.length > room) setError(`You can share up to ${MAX_PHOTOS} photos at a time.`);
    else setError(undefined);
    const added = files.slice(0, room).map((file) => {
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      return { key: `draft-${++draftSeq}`, file, preview, message: "", reactions: [] };
    });
    setDrafts((d) => [...d, ...added]);
  }

  function update(key: string, patch: Partial<Draft>) {
    setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }

  function remove(key: string) {
    setDrafts((d) => {
      const gone = d.find((x) => x.key === key);
      if (gone) {
        URL.revokeObjectURL(gone.preview);
        previews.current.delete(gone.preview);
      }
      return d.filter((x) => x.key !== key);
    });
  }

  async function submit() {
    if (!drafts.length) return;
    setPhase("sending");
    setError(undefined);
    try {
      const items = await Promise.all(
        drafts.map(async (d) => ({
          photo: await prepareImage(d.file),
          message: d.message.trim() || undefined,
          reactions: d.reactions,
          voiceNote: d.voiceNote,
        })),
      );
      const { memories } = await submitMemories(folderId, "guest", items, name.trim() || undefined);
      drafts.forEach((d) => URL.revokeObjectURL(d.preview));
      previews.current.clear();
      setDrafts([]);
      setSentCount(memories.length);
      setPhase("sent");
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(`We couldn't send your photos. ${(err as Error).message}. Please try again.`);
      setPhase("compose");
    }
  }

  if (folder === undefined) return <main className="min-h-dvh" />;

  if (folder === null) {
    return (
      <Shell>
        <h1 className="font-serif text-4xl leading-tight">This link isn&apos;t active.</h1>
        <p className="mt-4 text-[15px] text-muted">
          The memory folder may have been removed. Please check with the couple for the right QR code.
        </p>
      </Shell>
    );
  }

  if (phase === "sent") {
    return (
      <Shell>
        <p className="eyebrow">{folder.name}</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.05]">Thank you.</h1>
        <p className="mt-5 text-[15px] leading-relaxed text-muted">
          {sentCount === 1 ? "Your memory has" : `Your ${sentCount} memories have`} been saved to the{" "}
          <span className="text-ink">{folder.name}</span> album. The couple will see{" "}
          {sentCount === 1 ? "it" : "them"} there.
        </p>
        <button className="btn mt-10 w-full" onClick={() => setPhase("compose")}>
          Share more photos
        </button>
      </Shell>
    );
  }

  const sending = phase === "sending";

  return (
    <Shell>
      <p className="eyebrow">{folder.name}</p>
      <h1 className="mt-4 font-serif text-[44px] leading-[1.02]">Be Part of Their Memories</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">
        Add the photos you took at the {folder.name}. A note, a reaction or a voice message is welcome too, but completely optional.
      </p>

      <input ref={picker} type="file" accept="image/*" multiple className="hidden" onChange={pick} />

      {drafts.length === 0 ? (
        <button
          type="button"
          onClick={() => picker.current?.click()}
          className="mt-10 flex aspect-square w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-faint text-center transition-colors hover:border-ink active:bg-wash"
        >
          <UploadIcon />
          <span className="mt-5 font-serif text-3xl">Upload photos</span>
          <span className="mt-2 px-6 text-sm text-muted">Tap to choose from your gallery · select as many as you like</span>
        </button>
      ) : (
        <ol className="mt-10 space-y-12">
          {drafts.map((d, i) => (
            <li key={d.key}>
              <DraftCard
                draft={d}
                index={i}
                disabled={sending}
                onChange={(patch) => update(d.key, patch)}
                onRemove={() => remove(d.key)}
              />
            </li>
          ))}
        </ol>
      )}

      {drafts.length > 0 && (
        <>
          <button
            type="button"
            className="mt-12 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-faint py-6 text-[15px] transition-colors hover:border-ink active:bg-wash disabled:opacity-40"
            onClick={() => picker.current?.click()}
            disabled={sending || drafts.length >= MAX_PHOTOS}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full border border-ink text-lg leading-none">+</span>
            Add more photos
          </button>
          <label className="mt-10 block">
            <span className="eyebrow">Your name (optional)</span>
            <input
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="So they know who it's from"
              className="field mt-1"
              autoComplete="name"
            />
          </label>
        </>
      )}

      {error && (
        <p role="alert" className="mt-6 text-sm text-ink">
          {error}
        </p>
      )}

      {drafts.length > 0 && (
        <div className="sticky bottom-0 -mx-5 mt-10 border-t border-line bg-paper/95 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <button className="btn w-full" onClick={submit} disabled={sending}>
            {sending
              ? "Sending…"
              : `Share ${drafts.length} ${drafts.length === 1 ? "photo" : "photos"}`}
          </button>
        </div>
      )}
    </Shell>
  );
}

function DraftCard({
  draft,
  index,
  disabled,
  onChange,
  onRemove,
}: {
  draft: Draft;
  index: number;
  disabled: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
}) {
  const [picking, setPicking] = useState(false);

  function toggle(emoji: string) {
    onChange({
      reactions: draft.reactions.includes(emoji)
        ? draft.reactions.filter((e) => e !== emoji)
        : [...draft.reactions, emoji],
    });
  }

  // Emoji picked from the full picker sit in front of the quick ones.
  const extras = draft.reactions.filter((e) => !QUICK_REACTIONS.includes(e));

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <div className="flex items-center justify-between pb-3">
        <span className="text-xs text-muted tabular-nums">Photo {index + 1}</span>
        <button type="button" onClick={onRemove} className="link text-muted">
          Remove
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={draft.preview} alt={`Selected photo ${index + 1}`} className="max-h-[70vh] w-full bg-wash object-contain" />

      <textarea
        value={draft.message}
        onChange={(e) => onChange({ message: e.target.value })}
        maxLength={1000}
        rows={2}
        placeholder="Write a note (optional)"
        className="field mt-4 resize-none font-serif text-lg"
      />

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow">React</p>
          <p className="text-xs text-muted" aria-live="polite">
            {draft.reactions.length ? `${draft.reactions.join(" ")} added` : "Tap to add"}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Reactions">
          {[...extras, ...QUICK_REACTIONS].map((emoji) => {
            const on = draft.reactions.includes(emoji);
            return (
              <button
                key={emoji}
                type="button"
                aria-pressed={on}
                aria-label={`${on ? "Remove" : "Add"} ${emoji}`}
                onClick={() => toggle(emoji)}
                className={`relative grid h-11 w-11 place-items-center rounded-full text-[22px] transition duration-150 active:scale-90 ${
                  on ? "scale-105 bg-ink/[0.07] ring-2 ring-ink" : "ring-1 ring-line"
                }`}
              >
                {emoji}
                {on && (
                  <span className="absolute -top-1 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-ink text-paper ring-2 ring-paper">
                    <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
                      <path d="M1.5 5.2l2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.6" fill="none" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setPicking(true)}
            aria-label="More emoji"
            className="grid h-11 w-11 place-items-center rounded-full border border-dashed border-faint text-xl text-muted transition hover:border-ink hover:text-ink"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-6">
        <VoiceNoteInput value={draft.voiceNote} onChange={(voiceNote) => onChange({ voiceNote })} />
      </div>

      <EmojiPicker
        open={picking}
        selected={draft.reactions}
        onPick={toggle}
        onClose={() => setPicking(false)}
      />
    </fieldset>
  );
}

function UploadIcon() {
  return (
    <span className="grid h-16 w-16 place-items-center rounded-full bg-ink text-paper">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M12 16V4M7 9l5-5 5 5M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pt-12 pb-10">
      {children}
      <p className="mt-16 text-center text-[11px] tracking-[0.18em] text-faint uppercase">Wedding Memories</p>
    </main>
  );
}

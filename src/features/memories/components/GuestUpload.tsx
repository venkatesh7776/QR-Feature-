"use client";

import { useEffect, useRef, useState } from "react";
import { fetchFolder, submitMemories } from "../lib/api";
import { formatDate, prepareImage } from "../lib/media";
import { QUICK_REACTIONS } from "../lib/emoji";
import type { Folder } from "../lib/types";
import { wedding } from "../lib/wedding";
import { ArchEdge, Ganesha, KolamTexture, LotusDivider } from "./art/Ornaments";
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

  if (folder === undefined) return <main className="min-h-dvh bg-burgundy" />;

  if (folder === null) {
    return (
      <>
        <Cover eyebrow="Capture. Share. Relive." title="This link isn't active" />
        <Body>
          <p className="t-lead text-center text-ink-muted">
            The album may have been removed. Please ask the family for the QR code at the celebration.
          </p>
        </Body>
      </>
    );
  }

  if (phase === "sent") {
    return (
      <>
        <Cover eyebrow={folder.name} title="Thank you" />
        <Body>
          <div className="fade-in text-center">
            <p className="t-lead text-ink-muted">
              {sentCount === 1 ? "Your memory is" : `Your ${sentCount} memories are`} now part of the{" "}
              <span className="text-maroon not-italic">{folder.name}</span> album. The couple will treasure {sentCount === 1 ? "it" : "them"}.
            </p>
            <LotusDivider className="mt-8" />
            <button className="btn btn--gold mt-8 w-full" onClick={() => setPhase("compose")}>
              Share more photos
            </button>
          </div>
        </Body>
      </>
    );
  }

  const sending = phase === "sending";
  const date = formatDate(folder.date);

  return (
    <>
      <Cover eyebrow="Capture. Share. Relive." title={folder.name} date={date} />
      <Body>
        <p className="t-lead text-center text-ink-muted">
          Upload the beautiful moments you captured. A note, a reaction or a voice message is welcome too, but completely optional.
        </p>

        <input ref={picker} type="file" accept="image/*" multiple className="hidden" onChange={pick} />

        {drafts.length === 0 ? (
          <button
            type="button"
            onClick={() => picker.current?.click()}
            className="group relative mt-9 flex aspect-[4/4.4] w-full flex-col items-center justify-center overflow-hidden rounded-[999px_999px_6px_6px] border-2 border-dashed border-gold/60 bg-ivory-deep/60 px-6 text-center transition-colors hover:border-gold active:bg-ivory-deep"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-maroon text-ivory shadow-[0_14px_30px_-14px_rgba(72,20,31,0.7)] transition-transform duration-300 group-hover:-translate-y-0.5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M12 16V4M7 9l5-5 5 5M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="mt-5 font-display text-[2rem] leading-none text-maroon">Choose your photos</span>
            <span className="mt-3 text-sm text-ink-muted">From your gallery · as many as you like</span>
          </button>
        ) : (
          <ol className="mt-9 space-y-10">
            {drafts.map((d, i) => (
              <li key={d.key} className="fade-in">
                <DraftCard draft={d} index={i} disabled={sending} onChange={(patch) => update(d.key, patch)} onRemove={() => remove(d.key)} />
              </li>
            ))}
          </ol>
        )}

        {drafts.length > 0 && (
          <>
            <button
              type="button"
              className="mt-10 flex min-h-16 w-full items-center justify-center gap-3 rounded-sm border-2 border-dashed border-gold/55 text-[15px] text-maroon transition-colors hover:border-gold active:bg-ivory-deep disabled:opacity-40"
              onClick={() => picker.current?.click()}
              disabled={sending || drafts.length >= MAX_PHOTOS}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full border border-maroon/40 text-lg leading-none">+</span>
              Add more photos
            </button>
            <label className="mt-10 block">
              <span className="t-label text-[10px] text-gold">Your name (optional)</span>
              <input
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="So the couple knows who it's from"
                className="field mt-1"
                autoComplete="name"
              />
            </label>
          </>
        )}

        {error && (
          <p role="alert" className="mt-6 text-sm text-maroon">
            {error}
          </p>
        )}

        {drafts.length > 0 && (
          <div className="sticky bottom-0 -mx-5 mt-10 border-t border-gold/30 bg-ivory/95 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
            <button className="btn btn--gold w-full" onClick={submit} disabled={sending}>
              {sending ? "Sending…" : "Share your photos"}
              {!sending && <span className="rounded-full bg-burgundy/15 px-2 py-0.5 text-xs tabular-nums">{drafts.length}</span>}
            </button>
          </div>
        )}
      </Body>
    </>
  );
}

/** Burgundy cover: Ganesha, invocation, the couple, the event, a lotus, and an arch edge. */
function Cover({ eyebrow, title, date }: { eyebrow: string; title: string; date?: string }) {
  return (
    <header className="relative bg-burgundy px-5 pt-10 pb-14 text-center text-ivory">
      <KolamTexture className="opacity-[0.07]" id="kolam-guest" />
      <div className="rise-in relative mx-auto max-w-md">
        <Ganesha className="h-14" />
        <p className="mt-3 font-display text-[15px] text-gold-muted italic">{wedding.invocation}</p>
        <p className="mt-6 font-display text-[1.35rem] leading-tight text-ivory/90">
          {wedding.groom.name} <span className="text-gold italic">&amp;</span> {wedding.bride.name}
        </p>
        <p className="t-label mt-7 text-[10px] text-gold">{eyebrow}</p>
        <h1 className="mt-3 font-display text-[clamp(2.6rem,2rem+3vw,3.4rem)] leading-[1.02] text-ivory">{title}</h1>
        {date && <p className="mt-2 font-display text-lg text-ivory/70 italic">{date}</p>}
        <LotusDivider className="mt-6" />
      </div>
      <ArchEdge color="var(--burgundy)" />
    </header>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-[60dvh] max-w-md px-5 pt-12 pb-10">
      {children}
      <p className="t-label mt-16 text-center text-[9px] text-gold">Every Moment, A Memory</p>
    </main>
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
      reactions: draft.reactions.includes(emoji) ? draft.reactions.filter((e) => e !== emoji) : [...draft.reactions, emoji],
    });
  }

  // Emoji picked from the full picker sit in front of the quick ones.
  const extras = draft.reactions.filter((e) => !QUICK_REACTIONS.includes(e));

  return (
    <fieldset disabled={disabled} className="card min-w-0 p-4 shadow-[0_24px_50px_-34px_rgba(72,20,31,0.55)]">
      <div className="flex items-center justify-between pb-3">
        <span className="t-label text-[10px] text-gold">Photo {index + 1}</span>
        <button type="button" onClick={onRemove} className="link text-sm">
          Remove
        </button>
      </div>
      {/* Polaroid-style print */}
      <div className="bg-white p-[3%] pb-[6%] shadow-[0_12px_26px_-14px_rgba(72,20,31,0.5)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={draft.preview} alt={`Selected photo ${index + 1}`} className="max-h-[62vh] w-full bg-ivory-deep object-contain" />
      </div>

      <textarea
        value={draft.message}
        onChange={(e) => onChange({ message: e.target.value })}
        maxLength={1000}
        rows={2}
        placeholder="Write a note for the couple (optional)"
        className="field mt-4 resize-none font-display text-xl text-maroon italic"
      />

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <p className="t-label text-[10px] text-gold">React</p>
          <p className="text-xs text-ink-muted" aria-live="polite">
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
                  on ? "scale-105 bg-gold/15 ring-2 ring-maroon" : "bg-ivory ring-1 ring-gold/35"
                }`}
              >
                {emoji}
                {on && (
                  <span className="absolute -top-1 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full bg-maroon text-ivory ring-2 ring-ivory">
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
            className="grid h-11 w-11 place-items-center rounded-full border border-dashed border-gold/70 text-xl text-maroon transition hover:border-maroon"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-6">
        <VoiceNoteInput value={draft.voiceNote} onChange={(voiceNote) => onChange({ voiceNote })} />
      </div>

      <EmojiPicker open={picking} selected={draft.reactions} onPick={toggle} onClose={() => setPicking(false)} />
    </fieldset>
  );
}

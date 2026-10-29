"use client";

import { useEffect, useRef, useState } from "react";
import { react } from "../lib/api";
import { formatTime } from "../lib/media";
import { QUICK_REACTIONS } from "../lib/emoji";
import type { Memory } from "../lib/types";
import { EmojiPicker } from "./EmojiPicker";
import { CloseButton } from "./Modal";
import { VoicePlayer } from "./VoicePlayer";

export function MemoryViewer({
  memories,
  index,
  onIndexChange,
  onClose,
  onUpdate,
}: {
  memories: Memory[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onUpdate: (m: Memory) => void;
}) {
  const memory = memories[index];
  const [pending, setPending] = useState<string>();
  const [picking, setPicking] = useState(false);
  const touchX = useRef<number | undefined>(undefined);
  const prev = index > 0 ? () => onIndexChange(index - 1) : undefined;
  const next = index < memories.length - 1 ? () => onIndexChange(index + 1) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev?.();
      if (e.key === "ArrowRight") next?.();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  });

  async function addReaction(emoji: string) {
    setPending(emoji);
    try {
      onUpdate(await react(memory.id, emoji));
    } finally {
      setPending(undefined);
    }
  }

  const from = memory.source === "couple" ? "Added by you" : memory.guestName ? `From ${memory.guestName}` : "From a guest";

  return (
    <div role="dialog" aria-modal="true" aria-label="Memory" className="fixed inset-0 z-50 flex flex-col bg-paper lg:flex-row">
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center bg-wash px-4 py-4 sm:px-24 sm:py-10"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
          if (Math.abs(dx) > 50) (dx < 0 ? next : prev)?.();
          touchX.current = undefined;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={memory.id} src={memory.photoUrl} alt={memory.message ?? ""} className="max-h-full max-w-full object-contain" />
        <NavButton label="Previous photo" onClick={prev} className="left-3 sm:left-6">
          <path d="M11 4L6 9l5 5" />
        </NavButton>
        <NavButton label="Next photo" onClick={next} className="right-3 sm:right-6">
          <path d="M7 4l5 5-5 5" />
        </NavButton>
      </div>

      <aside className="flex max-h-[48dvh] flex-col overflow-y-auto border-t border-line lg:max-h-none lg:w-[380px] lg:border-t-0 lg:border-l">
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="text-xs text-muted tabular-nums">
            {index + 1} / {memories.length}
          </span>
          <div className="-mr-2">
            <CloseButton onClick={onClose} />
          </div>
        </div>

        <div className="flex-1 px-6 pb-8">
          <p className="eyebrow mt-4">{from}</p>
          <p className="mt-1 text-sm text-muted">{formatTime(memory.createdAt)}</p>

          {memory.message ? (
            <blockquote className="mt-8 font-serif text-2xl leading-snug">“{memory.message}”</blockquote>
          ) : (
            <p className="mt-8 text-sm text-faint">No written message.</p>
          )}

          {memory.voiceNoteUrl && (
            <div className="mt-8">
              <p className="eyebrow">Voice note</p>
              <div className="mt-3">
                <VoicePlayer key={memory.id} src={memory.voiceNoteUrl} />
              </div>
            </div>
          )}

          <div className="mt-10 border-t border-line pt-6">
            <p className="eyebrow">Reactions</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {reactionList(memory).map(([emoji, count]) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={pending !== undefined}
                  onClick={() => addReaction(emoji)}
                  aria-label={`React ${emoji}, ${count} so far`}
                  className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-lg transition active:scale-95 ${
                    count ? "bg-ink/[0.06] ring-1 ring-ink" : "opacity-60 ring-1 ring-line hover:opacity-100"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPicking(true)}
                aria-label="More emoji"
                className="grid h-10 w-10 place-items-center rounded-full border border-dashed border-faint text-lg text-muted hover:border-ink hover:text-ink"
              >
                +
              </button>
            </div>
            <p className="mt-3 text-xs text-faint">Tap to add your own reaction.</p>
          </div>

          <a href={memory.photoUrl} download className="link mt-10 inline-block text-muted">
            Download original
          </a>
        </div>
      </aside>
      <EmojiPicker
        open={picking}
        selected={[]}
        onPick={(emoji) => {
          setPicking(false);
          addReaction(emoji);
        }}
        onClose={() => setPicking(false)}
      />
    </div>
  );
}

/** Reactions it already has (most first), then the quick ones it doesn't. */
function reactionList(memory: Memory): [string, number][] {
  const have = Object.entries(memory.reactions)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const rest = QUICK_REACTIONS.filter((e) => !memory.reactions[e]).map((e): [string, number] => [e, 0]);
  return [...have, ...rest];
}

function NavButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick?: () => void;
  className: string;
  children: React.ReactNode;
}) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-ink text-paper shadow-[0_2px_10px_rgba(0,0,0,0.18)] transition hover:scale-110 hover:bg-black focus-visible:scale-110 active:scale-95 ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

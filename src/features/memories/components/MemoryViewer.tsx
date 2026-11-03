"use client";

import { useEffect, useRef } from "react";
import { formatTime } from "../lib/media";
import type { Memory } from "../lib/types";
import { VoicePlayer } from "./VoicePlayer";

/** "Shared by Meera", as the invitation credits photos. */
export const credit = (m: Memory) =>
  m.source === "couple" ? "Shared by the couple" : m.guestName ? `Shared by ${m.guestName}` : "Shared by a guest";

/** Full-screen viewer on deep burgundy with a details panel, matching the invitation's. */
export function MemoryViewer({
  memories,
  index,
  onIndexChange,
  onClose,
}: {
  memories: Memory[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const memory = memories[index];
  const touch = useRef<{ x: number; y: number } | null>(null);
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

  // Warm the neighbours so swiping feels instant.
  useEffect(() => {
    for (const n of [memories[index - 1], memories[index + 1]]) if (n) new Image().src = n.photoUrl;
  }, [index, memories]);

  const reactions = givenReactions(memory);
  const hasDetails = Boolean(memory.message || memory.voiceNoteUrl || reactions.length);
  const navBtn =
    "grid h-12 w-12 place-items-center rounded-full border border-gold/40 bg-burgundy/70 text-ivory backdrop-blur transition-colors hover:border-gold hover:bg-burgundy";

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-50 flex flex-col bg-[#1f0a0f] text-ivory lg:flex-row">
      <div
        className="relative flex min-h-0 flex-1 flex-col"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s) return;
          const dx = e.changedTouches[0].clientX - s.x;
          const dy = e.changedTouches[0].clientY - s.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)?.();
          else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose();
        }}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <p className="t-label text-[10px] text-gold-muted tabular-nums">
            {index + 1} / {memories.length}
          </p>
          <button type="button" onClick={onClose} aria-label="Close viewer" className={navBtn}>
            <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-3 sm:px-20">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL */}
          <img
            key={memory.id}
            src={memory.photoUrl}
            alt={memory.message ?? credit(memory)}
            className="fade-in max-h-full max-w-full object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] select-none"
          />
          {prev && (
            <button type="button" onClick={prev} aria-label="Previous photo" className={`${navBtn} absolute top-1/2 left-3 -translate-y-1/2`}>
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
                <path d="M10 3L5 8l5 5" />
              </svg>
            </button>
          )}
          {next && (
            <button type="button" onClick={next} aria-label="Next photo" className={`${navBtn} absolute top-1/2 right-3 -translate-y-1/2`}>
              <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* details: who shared it, their note, voice note and reactions */}
      <aside className="max-h-[42dvh] shrink-0 overflow-y-auto border-t border-gold/20 bg-[#2a0d14] px-6 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:max-h-none lg:w-[380px] lg:border-t-0 lg:border-l lg:pt-20">
        <p className="t-label text-[10px] text-gold">{credit(memory)}</p>
        <p className="mt-1 text-xs text-ivory/50">{formatTime(memory.createdAt)}</p>

        {memory.message && <blockquote className="mt-5 font-display text-[1.55rem] leading-snug text-ivory italic">“{memory.message}”</blockquote>}

        {memory.voiceNoteUrl && (
          <div className="mt-6">
            <p className="t-label mb-3 text-[10px] text-gold-muted">Voice note</p>
            <VoicePlayer key={memory.id} src={memory.voiceNoteUrl} tone="dark" />
          </div>
        )}

        {reactions.length > 0 && (
          <div className="mt-6 border-t border-gold/15 pt-5">
            <p className="t-label mb-3 text-[10px] text-gold-muted">Reactions</p>
            <ul className="flex flex-wrap gap-2">
              {reactions.map(([emoji, count]) => (
                <li key={emoji} aria-label={`${emoji} ${count}`} className="flex h-9 items-center gap-1.5 rounded-full border border-gold/30 px-3 text-base">
                  <span>{emoji}</span>
                  <span className="text-xs text-ivory/70 tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!hasDetails && <p className="mt-5 text-sm text-ivory/45">No note with this photo.</p>}

        <a href={memory.photoUrl} download className="mt-8 inline-flex border-b border-gold/40 text-sm text-gold-muted transition-colors hover:border-gold hover:text-gold">
          Download original
        </a>
        {memories.length > 1 && <p className="mt-6 text-[11px] text-ivory/40 lg:hidden">Swipe the photo to browse · swipe down to close</p>}
      </aside>
    </div>
  );
}

/** Only the reactions people actually gave, most popular first. */
function givenReactions(memory: Memory): [string, number][] {
  return Object.entries(memory.reactions)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
}

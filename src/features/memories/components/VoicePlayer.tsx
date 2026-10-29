"use client";

import { useEffect, useRef, useState } from "react";

/** Compact play/pause player with a progress bar. Accepts a URL or a Blob. */
export function VoicePlayer({ src, fallbackSeconds = 0 }: { src: string | Blob; fallbackSeconds?: number }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (typeof src === "string") return setUrl(src);
    const next = URL.createObjectURL(src);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [src]);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDuration(0);
  }, [url]);

  function onMeta() {
    const el = audio.current!;
    if (Number.isFinite(el.duration)) return setDuration(el.duration);
    // Recorded webm often reports Infinity until it has been scanned once.
    const fix = () => {
      el.removeEventListener("timeupdate", fix);
      if (Number.isFinite(el.duration)) setDuration(el.duration);
      el.currentTime = 0;
    };
    el.addEventListener("timeupdate", fix);
    el.currentTime = 1e7;
  }

  function toggle() {
    const el = audio.current!;
    if (el.paused) el.play().catch(() => setPlaying(false));
    else el.pause();
  }

  const total = duration || fallbackSeconds;
  const progress = total ? Math.min(1, time / total) : 0;

  return (
    <div className="flex items-center gap-3 border border-line px-3 py-2.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-paper"
      >
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <rect x="2" y="1" width="3" height="10" fill="currentColor" />
            <rect x="7" y="1" width="3" height="10" fill="currentColor" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path d="M3 1l8 5-8 5z" fill="currentColor" />
          </svg>
        )}
      </button>
      <div className="h-[3px] flex-1 bg-line">
        <div className="h-full bg-ink" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-muted tabular-nums">
        {clock(playing || time ? time : total)}
      </span>
      {url && (
        <audio
          ref={audio}
          src={url}
          preload="metadata"
          onLoadedMetadata={onMeta}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setTime(0);
          }}
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime;
            if (t < 1e6) setTime(t);
          }}
          className="hidden"
        />
      )}
    </div>
  );
}

function clock(s: number) {
  const n = Math.round(s);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

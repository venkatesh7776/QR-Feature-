"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Rounded voice-note player in the invitation's style: a gold play button and
 * a thin progress line. `tone` picks the light (ivory) or dark (viewer) look.
 * Accepts a URL or a Blob.
 */
export function VoicePlayer({ src, fallbackSeconds = 0, tone = "light" }: { src: string | Blob; fallbackSeconds?: number; tone?: "light" | "dark" }) {
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
  const dark = tone === "dark";

  return (
    <div className={`flex items-center gap-3 rounded-full border py-2 pr-4 pl-2 ${dark ? "border-gold/35 bg-white/5" : "border-gold/45 bg-ivory"}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform hover:scale-105 ${dark ? "bg-gold text-burgundy" : "bg-maroon text-ivory"}`}
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
          {playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="M5 3l8 5-8 5z" />}
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <div className={`h-1 overflow-hidden rounded-full ${dark ? "bg-ivory/15" : "bg-gold/20"}`}>
          <div className="h-full rounded-full bg-gold transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className={`mt-1.5 text-[11px] tabular-nums ${dark ? "text-ivory/60" : "text-ink-muted"}`}>
          {total ? `${clock(playing || time ? time : 0)} / ${clock(total)}` : "Voice note"}
        </p>
      </div>
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

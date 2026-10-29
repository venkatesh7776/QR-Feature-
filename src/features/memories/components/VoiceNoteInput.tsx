"use client";

import { useEffect, useRef, useState } from "react";
import { VoicePlayer } from "./VoicePlayer";

const MAX_SECONDS = 60;
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"];
const BARS = 24;

type Status = "idle" | "starting" | "recording";

function canRecord() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

/**
 * Record a short voice note with the microphone, or attach an audio file
 * where recording isn't available (browsers only allow the mic on https).
 */
export function VoiceNoteInput({
  value,
  onChange,
}: {
  value?: Blob;
  onChange: (blob: Blob | undefined) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const [error, setError] = useState<string>();
  const [supported, setSupported] = useState(true);
  const recorder = useRef<MediaRecorder | null>(null);
  const discard = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setSupported(canRecord()), []);

  useEffect(() => {
    if (status !== "recording") return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_SECONDS) stop();
    }, 250);
    return () => clearInterval(timer);
  }, [status]);

  // Release the microphone if the component goes away mid-recording.
  useEffect(() => () => stop(true), []);

  function stop(cancel = false) {
    discard.current = cancel;
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function start() {
    setError(undefined);
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      const stopMeter = meter(stream, setLevels);
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopMeter();
        recorder.current = null;
        setStatus("idle");
        setLevels(Array(BARS).fill(0));
        const type = (rec.mimeType || "audio/webm").split(";")[0];
        if (chunks.length && !discard.current) onChange(new Blob(chunks, { type }));
      };
      recorder.current = rec;
      discard.current = false;
      rec.start();
      setSeconds(0);
      setStatus("recording");
    } catch (err) {
      setStatus("idle");
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Microphone access was blocked. Allow it for this site in your browser settings, or attach an audio file."
          : name === "NotFoundError"
            ? "No microphone was found. You can attach an audio file instead."
            : "Recording didn't start. You can attach an audio file instead.",
      );
    }
  }

  function attach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio/")) return setError("Please choose an audio file.");
    if (file.size > 15 * 1024 * 1024) return setError("That audio file is too large (15 MB max).");
    setError(undefined);
    onChange(file);
  }

  const attachButton = (
    <>
      <input ref={fileInput} type="file" accept="audio/*" className="hidden" onChange={attach} />
      <button type="button" className="link text-muted" onClick={() => fileInput.current?.click()}>
        Attach an audio file instead
      </button>
    </>
  );

  if (value) {
    return (
      <div>
        <p className="eyebrow mb-2">Your voice note</p>
        <VoicePlayer src={value} fallbackSeconds={seconds} />
        <div className="mt-2 flex gap-5">
          {supported && (
            <button type="button" className="link text-muted" onClick={() => { onChange(undefined); start(); }}>
              Record again
            </button>
          )}
          <button type="button" className="link text-muted" onClick={() => onChange(undefined)}>
            Delete
          </button>
        </div>
      </div>
    );
  }

  if (status === "recording") {
    return (
      <div className="flex items-center gap-4 border border-ink px-4 py-3" role="status" aria-live="polite">
        <button
          type="button"
          onClick={() => stop()}
          aria-label="Stop recording"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink"
        >
          <span className="h-4 w-4 rounded-[3px] bg-paper" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex h-7 items-center gap-[3px]" aria-hidden>
            {levels.map((l, i) => (
              <span key={i} className="w-[3px] flex-1 rounded-full bg-ink transition-[height] duration-75" style={{ height: `${Math.max(12, l * 100)}%` }} />
            ))}
          </div>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted tabular-nums">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d33]" />
            Recording {clock(seconds)} <span className="text-faint">of {clock(MAX_SECONDS)}</span>
          </p>
        </div>
        <button type="button" className="link shrink-0 text-muted" onClick={() => stop(true)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={supported ? start : () => fileInput.current?.click()}
        disabled={status === "starting"}
        className="flex w-full items-center gap-4 border border-line px-4 py-3 text-left transition-colors hover:border-ink active:bg-wash"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-paper">
          <MicIcon />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px]">
            {status === "starting" ? "Allow the microphone…" : supported ? "Record a voice note" : "Add a voice note"}
          </span>
          <span className="block text-xs text-muted">
            {supported ? "Tap and start talking · up to 1 minute" : "Choose a voice memo from your phone"}
          </span>
        </span>
      </button>
      <div className="mt-2">{attachButton}</div>
      {!supported && !error && (
        <p className="mt-1.5 text-xs text-faint">
          Live recording needs a secure (https) link. This page was opened without one.
        </p>
      )}
      {error && <p className="mt-1.5 text-xs text-ink">{error}</p>}
    </div>
  );
}

/** Live input level, for feedback that the mic is actually hearing them. */
function meter(stream: MediaStream, onLevels: (levels: number[]) => void) {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const history: number[] = Array(BARS).fill(0);
    let frame = 0;
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
      if (++frame % 3 === 0) {
        history.shift();
        history.push(Math.min(1, peak * 2.2));
        onLevels([...history]);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      ctx.close();
    };
  } catch {
    return () => undefined;
  }
}

function clock(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <rect x="4.5" y="1" width="5" height="8" rx="2.5" />
      <path d="M2.5 6.5a4.5 4.5 0 009 0M7 11v2.5" />
    </svg>
  );
}

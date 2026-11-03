"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { wedding } from "../lib/wedding";
import { ArchEdge, Ganesha, KolamTexture, LotusDivider } from "./art/Ornaments";

/** The couple's passcode screen, in the invitation's style. */
export function CoupleLogin({ next }: { next?: string }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim()) return setError("Please enter the passcode.");
    setBusy(true);
    setError(undefined);
    const res = await fetch("/api/memories/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    }).catch(() => undefined);
    if (res?.ok) {
      // Only ever return to a page on this site.
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/memories");
      router.refresh();
      return;
    }
    const body = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    setError(body?.error ?? "Couldn't check the passcode. Please try again.");
    setPasscode("");
    setBusy(false);
  }

  return (
    <main className="flex min-h-dvh flex-col bg-ivory">
      <header className="relative bg-burgundy px-5 pt-14 pb-16 text-center text-ivory">
        <KolamTexture className="opacity-[0.07]" id="kolam-login" />
        <div className="rise-in relative mx-auto max-w-md">
          <Ganesha className="h-16" />
          <p className="mt-3 font-display text-[15px] text-gold-muted italic">{wedding.invocation}</p>
          <p className="t-label mt-7 text-[10px] text-gold">Every Moment, A Memory</p>
          <h1 className="t-h2 mt-3 !text-ivory">Wedding Memories</h1>
          <p className="mt-3 font-display text-lg text-ivory/75 italic">
            {wedding.groom.name} <span className="text-gold">&amp;</span> {wedding.bride.name}
          </p>
          <LotusDivider className="mt-6" />
        </div>
        <ArchEdge color="var(--burgundy)" />
      </header>

      <form onSubmit={submit} className="fade-in mx-auto w-full max-w-sm px-5 pt-14 pb-16">
        <label className="block text-center">
          <span className="t-label text-[10px] text-gold">Couple&apos;s passcode</span>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              setError(undefined);
            }}
            aria-invalid={!!error}
            disabled={busy}
            className="field mt-3 text-center font-display text-4xl tracking-[0.5em] text-maroon"
          />
        </label>
        {error && (
          <p role="alert" className="mt-4 text-center text-sm text-maroon">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--gold mt-8 w-full" disabled={busy}>
          {busy ? "Opening…" : "Open"}
        </button>
        <p className="mt-6 text-center text-xs leading-relaxed text-ink-muted">
          Guests don&apos;t need this — they share photos by scanning the QR code at each celebration.
        </p>
      </form>
    </main>
  );
}

/** "Lock" in the header: signs the couple out on this device. */
export function LockButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/memories/session", { method: "DELETE" }).catch(() => undefined);
        router.replace("/login");
        router.refresh();
      }}
      className={`t-label inline-flex min-h-11 items-center gap-2 text-[10px] text-gold-muted transition-colors hover:text-gold ${className}`}
    >
      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.4}>
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
      </svg>
      Lock
    </button>
  );
}

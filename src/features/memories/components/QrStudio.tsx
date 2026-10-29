"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchFolder, fetchShareOrigin, guestPath } from "../lib/api";
import { formatDate } from "../lib/media";
import { CARD_THEMES, drawCard, loadCardFonts } from "../lib/qr-card";
import type { Folder } from "../lib/types";

type OriginKind = Awaited<ReturnType<typeof fetchShareOrigin>>["kind"];

export function QrStudio({ folderId }: { folderId: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [folder, setFolder] = useState<Folder>();
  const [missing, setMissing] = useState(false);
  const [origin, setOrigin] = useState<{ origin: string; kind: OriginKind }>();
  const [fontsReady, setFontsReady] = useState(false);
  const [themeId, setThemeId] = useState(CARD_THEMES[0].id);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [instruction, setInstruction] = useState("Scan to share your memories");
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    fetchFolder(folderId).then(
      ({ folder }) => {
        setFolder(folder);
        setTitle(folder.name);
        setSubtitle(formatDate(folder.date));
      },
      () => setMissing(true),
    );
    fetchShareOrigin().then(setOrigin);
    loadCardFonts().then(() => setFontsReady(true));
  }, [folderId]);

  const url = origin ? `${origin.origin}${guestPath(folderId)}` : "";
  const theme = CARD_THEMES.find((t) => t.id === themeId)!;

  useEffect(() => {
    if (!canvas.current || !folder || !url || !fontsReady) return;
    drawCard(canvas.current, theme, {
      url,
      eyebrow: folder.type ? `${folder.type} · Wedding Memories` : "Wedding Memories",
      title: title.trim() || folder.name,
      subtitle,
      instruction: instruction.trim() || "Scan to share your memories",
      footnote: "No app needed · open your camera",
    });
  }, [folder, url, fontsReady, theme, title, subtitle, instruction]);

  function download() {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slug(title || folder!.name)}-qr-card.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setDownloaded(true);
    }, "image/png");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  if (missing) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-24 text-center">
        <p className="font-serif text-4xl">This folder doesn&apos;t exist.</p>
        <Link href="/memories" className="link mt-6 inline-block">Back to all folders</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 sm:px-10">
      <nav className="pt-8">
        <Link href={`/memories/${folderId}`} className="text-sm text-muted transition-colors hover:text-ink">
          ← {folder?.name ?? "Folder"}
        </Link>
      </nav>

      <header className="border-b border-line pt-10 pb-10">
        <p className="eyebrow">QR code</p>
        <h1 className="mt-4 font-serif text-5xl leading-[1.05] sm:text-6xl">A card for your guests</h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
          Print it for the tables or put it up on a screen. Anything guests share through this code
          goes straight into <span className="text-ink">{folder?.name ?? "this folder"}</span>.
        </p>
      </header>

      <div className="grid gap-12 pt-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <div className="flex justify-center bg-wash p-6 sm:p-12">
          <canvas
            ref={canvas}
            aria-label="QR card preview"
            className="aspect-[5/7] w-full max-w-[440px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          />
        </div>

        <div className="flex flex-col">
          <fieldset>
            <legend className="eyebrow">Theme</legend>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {CARD_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={t.id === themeId}
                  onClick={() => setThemeId(t.id)}
                  className={`border p-1.5 text-left transition-colors ${t.id === themeId ? "border-ink" : "border-line hover:border-faint"}`}
                >
                  <span className="block aspect-[5/7] border" style={{ background: t.background, borderColor: t.rule }} />
                  <span className="mt-1.5 block text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="mt-8 block">
            <span className="eyebrow">Event name</span>
            <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} className="field mt-1" />
          </label>
          <label className="mt-6 block">
            <span className="eyebrow">Second line</span>
            <input
              value={subtitle}
              maxLength={50}
              placeholder="e.g. Ananya & Rohan · 12 December"
              onChange={(e) => setSubtitle(e.target.value)}
              className="field mt-1"
            />
          </label>
          <label className="mt-6 block">
            <span className="eyebrow">Instruction</span>
            <input value={instruction} maxLength={40} onChange={(e) => setInstruction(e.target.value)} className="field mt-1" />
          </label>

          <button className="btn mt-10" onClick={download} disabled={!folder || !url || !fontsReady}>
            Download QR card (PNG)
          </button>
          {downloaded && (
            <p role="status" className="mt-3 text-sm text-muted">
              Saved. That&apos;s all you need to do. Guest photos will appear in the folder automatically.
            </p>
          )}

          <div className="mt-10 border-t border-line pt-6">
            <p className="eyebrow">Guest link</p>
            <p className="mt-2 text-sm break-all">{url || "…"}</p>
            <div className="mt-3 flex gap-5">
              <button type="button" className="link" onClick={copy} disabled={!url}>
                {copied ? "Copied" : "Copy link"}
              </button>
              <a href={url || undefined} target="_blank" rel="noreferrer" className="link">
                Open guest page
              </a>
            </div>
            {origin && <OriginNote kind={origin.kind} />}
          </div>
        </div>
      </div>
    </main>
  );
}

function OriginNote({ kind }: { kind: OriginKind }) {
  if (kind === "lan") {
    return (
      <p className="mt-4 text-xs leading-relaxed text-faint">
        Demo mode: this link uses your computer&apos;s Wi-Fi address, so phones on the same network can
        open it. It&apos;s plain http, so phones can&apos;t record voice notes live. Run{" "}
        <code className="text-muted">npm run share</code> for an https link that can.
      </p>
    );
  }
  if (kind === "local") {
    return (
      <p className="mt-4 text-xs leading-relaxed text-faint">
        This link only works on this computer. Connect to Wi-Fi, or run npm run share for a public https link.
      </p>
    );
  }
  return null;
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "wedding";
}

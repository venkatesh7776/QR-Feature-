"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchFolder, fetchShareOrigin, guestPath } from "../lib/api";
import { formatDate } from "../lib/media";
import { CARD_THEMES, drawCard, loadCardAssets } from "../lib/qr-card";
import type { Folder } from "../lib/types";
import { wedding } from "../lib/wedding";
import { LotusDivider } from "./art/Ornaments";
import { AlbumBar, SoftNotice } from "./Chrome";

type OriginKind = Awaited<ReturnType<typeof fetchShareOrigin>>["kind"];

const DEFAULT_INSTRUCTION = "Scan to share your photos with us";

export function QrStudio({ folderId }: { folderId: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [folder, setFolder] = useState<Folder>();
  const [missing, setMissing] = useState(false);
  const [origin, setOrigin] = useState<{ origin: string; kind: OriginKind }>();
  const [assetsReady, setAssetsReady] = useState(false);
  const [themeId, setThemeId] = useState(CARD_THEMES[0].id);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [instruction, setInstruction] = useState(DEFAULT_INSTRUCTION);
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
    loadCardAssets().then(() => setAssetsReady(true));
  }, [folderId]);

  const url = origin ? `${origin.origin}${guestPath(folderId)}` : "";
  const theme = CARD_THEMES.find((t) => t.id === themeId)!;

  useEffect(() => {
    if (!canvas.current || !folder || !url || !assetsReady) return;
    drawCard(canvas.current, theme, {
      url,
      invocation: wedding.invocation,
      groom: wedding.groom.name,
      bride: wedding.bride.name,
      title: title.trim() || folder.name,
      subtitle,
      instruction: instruction.trim() || DEFAULT_INSTRUCTION,
      footnote: "No app needed · just your camera",
    });
  }, [folder, url, assetsReady, theme, title, subtitle, instruction]);

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
      <>
        <AlbumBar title="Album not found" back={{ href: "/memories", label: "All Albums", short: "Albums" }} />
        <main className="gutter py-20">
          <SoftNotice title="This album doesn't exist" icon="folder">
            <Link href="/memories" className="link">Back to all albums</Link>
          </SoftNotice>
        </main>
      </>
    );
  }

  return (
    <>
      <AlbumBar title="QR card" back={{ href: `/memories/${folderId}`, label: folder?.name ?? "Album", short: "Back" }} />
      <main className="gutter pb-24">
        <div className="container-wide">
          <section className="rise-in py-10 text-center sm:py-14">
            <p className="t-label text-[10px] text-gold">Capture. Share. Relive.</p>
            <h2 className="t-h2 mt-3">A card for your guests</h2>
            <LotusDivider className="mt-5" />
            <p className="t-lead mx-auto mt-5 max-w-xl text-ink-muted">
              Place it at the {folder?.name ?? "celebration"} or show it on a screen. Every photo guests share through it arrives in this album.
            </p>
          </section>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
            <div className="relative flex justify-center overflow-hidden rounded-sm bg-ivory-deep p-6 sm:p-12">
              <canvas
                ref={canvas}
                aria-label="QR card preview"
                className="fade-in aspect-[5/7] w-full max-w-[440px] shadow-[0_24px_50px_-28px_rgba(72,20,31,0.55)]"
              />
            </div>

            <div className="flex flex-col">
              <fieldset>
                <legend className="t-label text-[10px] text-gold">Card style</legend>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {CARD_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={t.id === themeId}
                      onClick={() => setThemeId(t.id)}
                      className={`rounded-sm border p-2 text-left transition-colors ${t.id === themeId ? "border-maroon" : "border-gold/35 hover:border-gold"}`}
                    >
                      <span className="relative block aspect-[5/7] border" style={{ background: t.background, borderColor: t.gold }}>
                        <span className="absolute inset-[18%_22%_30%] border" style={{ borderColor: t.gold, background: t.qrPanel }} />
                      </span>
                      <span className="mt-2 block text-xs text-maroon">{t.label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="mt-8 block">
                <span className="t-label text-[10px] text-gold">Event name</span>
                <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} className="field mt-1 font-display text-xl text-maroon" />
              </label>
              <label className="mt-6 block">
                <span className="t-label text-[10px] text-gold">Date line</span>
                <input value={subtitle} maxLength={50} placeholder="e.g. 18 November 2026" onChange={(e) => setSubtitle(e.target.value)} className="field mt-1" />
              </label>
              <label className="mt-6 block">
                <span className="t-label text-[10px] text-gold">Invitation line</span>
                <input value={instruction} maxLength={44} onChange={(e) => setInstruction(e.target.value)} className="field mt-1" />
              </label>

              <button className="btn btn--gold mt-10" onClick={download} disabled={!folder || !url || !assetsReady}>
                Download QR card (PNG)
              </button>
              {downloaded && (
                <p role="status" className="mt-3 text-sm text-ink-muted">
                  Saved. That&apos;s all you need to do — guests&apos; photos will arrive in the album on their own.
                </p>
              )}

              <div className="card mt-10 p-5">
                <p className="t-label text-[10px] text-gold">Guest link</p>
                <p className="mt-2 text-sm break-all text-ink">{url || "…"}</p>
                <div className="mt-4 flex gap-6">
                  <button type="button" className="link text-sm" onClick={copy} disabled={!url}>
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <a href={url || undefined} target="_blank" rel="noreferrer" className="link text-sm">
                    Open guest page
                  </a>
                </div>
                {origin && <OriginNote kind={origin.kind} />}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function OriginNote({ kind }: { kind: OriginKind }) {
  if (kind === "lan") {
    return (
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        Demo mode: this link uses your computer&apos;s Wi-Fi address, so phones on the same network can open it. It&apos;s plain http, so
        phones can&apos;t record voice notes live. Run <code className="text-maroon">npm run share</code> for an https link that can.
      </p>
    );
  }
  if (kind === "local") {
    return (
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        This link only works on this computer. Connect to Wi-Fi, or run npm run share for a public https link.
      </p>
    );
  }
  return null;
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "wedding";
}

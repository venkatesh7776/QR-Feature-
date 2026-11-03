"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fetchFolder, fetchShareOrigin, guestPath } from "../lib/api";
import { formatLongDate } from "../lib/media";
import { drawCard, loadCardAssets } from "../lib/qr-card";
import type { Folder } from "../lib/types";
import { wedding } from "../lib/wedding";
import { LotusDivider } from "./art/Ornaments";
import { AlbumBar, SoftNotice } from "./Chrome";

type OriginKind = Awaited<ReturnType<typeof fetchShareOrigin>>["kind"];

const DEFAULTS = {
  heading: "Scan the QR Code",
  tagline: "Share Your Moments",
  message: "Scan and upload the photos you capture today.",
};

export function QrStudio({ folderId }: { folderId: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [folder, setFolder] = useState<Folder>();
  const [missing, setMissing] = useState(false);
  const [origin, setOrigin] = useState<{ origin: string; kind: OriginKind }>();
  const [assetsReady, setAssetsReady] = useState(false);
  const [event, setEvent] = useState("");
  const [dateLine, setDateLine] = useState("");
  const [heading, setHeading] = useState(DEFAULTS.heading);
  const [tagline, setTagline] = useState(DEFAULTS.tagline);
  const [message, setMessage] = useState(DEFAULTS.message);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    fetchFolder(folderId).then(
      ({ folder }) => {
        setFolder(folder);
        setEvent(folder.name);
        setDateLine(formatLongDate(folder.date));
      },
      () => setMissing(true),
    );
    fetchShareOrigin().then(setOrigin);
    loadCardAssets().then(() => setAssetsReady(true));
  }, [folderId]);

  const url = origin ? `${origin.origin}${guestPath(folderId)}` : "";

  useEffect(() => {
    if (!canvas.current || !folder || !url || !assetsReady) return;
    drawCard(canvas.current, {
      url,
      invocation: wedding.invocation,
      groom: wedding.groom.short,
      bride: wedding.bride.short,
      event: event.trim() || folder.name,
      dateLine: dateLine.trim(),
      heading: heading.trim() || DEFAULTS.heading,
      tagline: tagline.trim() || DEFAULTS.tagline,
      message: message.trim() || DEFAULTS.message,
      site: wedding.siteLabel,
      footer: `${wedding.groom.name} & ${wedding.bride.name} · ${wedding.place}`,
    });
  }, [folder, url, assetsReady, event, dateLine, heading, tagline, message]);

  function download() {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `QR-${slug(event || folder!.name)}.png`;
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

  const fields: [string, string, (v: string) => void, number, string?][] = [
    ["Event name", event, setEvent, 40, "font-display text-xl text-maroon"],
    ["Date line", dateLine, setDateLine, 44],
    ["Heading", heading, setHeading, 32],
    ["Tagline", tagline, setTagline, 32],
    ["Message", message, setMessage, 60],
  ];

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
            <div className="flex justify-center rounded-sm bg-ivory-deep p-5 sm:p-10">
              <canvas
                ref={canvas}
                aria-label="QR card preview"
                className="fade-in aspect-[3/4] w-full max-w-[480px] shadow-[0_30px_60px_-30px_rgba(72,20,31,0.6)]"
              />
            </div>

            <div className="flex flex-col">
              {fields.map(([label, value, set, max, extra]) => (
                <label key={label} className="mb-6 block">
                  <span className="t-label text-[10px] text-gold">{label}</span>
                  <input value={value} maxLength={max} onChange={(e) => set(e.target.value)} className={`field mt-1 ${extra ?? ""}`} />
                </label>
              ))}

              <button className="btn btn--gold mt-4" onClick={download} disabled={!folder || !url || !assetsReady}>
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
  return s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "wedding";
}

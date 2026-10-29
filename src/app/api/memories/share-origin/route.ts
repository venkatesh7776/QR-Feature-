import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * The origin QR codes should point to. A QR code that encodes "localhost"
 * is useless on a guest's phone, so prefer an explicit public URL
 * (SHARE_ORIGIN, or the tunnel URL written by `npm run share`), then the
 * address this page was opened on, then the machine's Wi-Fi address.
 */
export async function GET(req: Request) {
  const configured = process.env.SHARE_ORIGIN ?? tunnelOrigin();
  if (configured) return NextResponse.json({ origin: configured.replace(/\/$/, ""), kind: "public" });

  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] ?? url.protocol.replace(":", "");
  const [hostname, port] = host.split(":");
  const isLocal = ["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname);

  if (!isLocal) {
    return NextResponse.json({ origin: `${proto}://${host}`, kind: proto === "https" ? "public" : "current" });
  }

  const lan = Object.values(networkInterfaces())
    .flat()
    .find((n) => n && n.family === "IPv4" && !n.internal)?.address;

  if (!lan) return NextResponse.json({ origin: `${proto}://${host}`, kind: "local" });
  return NextResponse.json({ origin: `http://${lan}${port ? `:${port}` : ""}`, kind: "lan" });
}

function tunnelOrigin() {
  const dir = process.env.MEMORIES_DATA_DIR ?? path.join(process.cwd(), ".data");
  try {
    return readFileSync(path.join(dir, "share-origin"), "utf8").trim() || undefined;
  } catch {
    return undefined;
  }
}

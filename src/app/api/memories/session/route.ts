import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, checkPasscode, lockEnabled, sessionToken } from "@/features/memories/server/auth";

export const dynamic = "force-dynamic";

// Best-effort brake on guessing: a short delay on every wrong passcode, and a
// cool-down after repeated misses from the same address (per server instance).
const misses = new Map<string, { count: number; until: number }>();
const MAX_MISSES = 5;
const COOL_DOWN_MS = 60_000;

/** Enter the passcode: sets the couple's cookie. */
export async function POST(req: Request) {
  if (!lockEnabled()) return NextResponse.json({ ok: true });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const record = misses.get(ip);
  if (record && record.count >= MAX_MISSES && record.until > now) {
    return NextResponse.json({ error: "Too many tries. Please wait a minute and try again." }, { status: 429 });
  }

  const { passcode } = (await req.json().catch(() => ({}))) as { passcode?: string };
  if (!passcode || !checkPasscode(passcode)) {
    await new Promise((r) => setTimeout(r, 600));
    const count = record && record.until > now ? record.count + 1 : 1;
    misses.set(ip, { count, until: now + COOL_DOWN_MS });
    return NextResponse.json({ error: "That passcode isn't right." }, { status: 401 });
  }

  misses.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !!process.env.VERCEL,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

/** Lock again: clears the cookie. */
export async function DELETE() {
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

/**
 * The couple's passcode lock. Guests never need it: the QR guest page and its
 * upload APIs stay open. The couple's pages and the APIs that list, create or
 * delete albums require a signed cookie, set by entering COUPLE_PASSCODE.
 *
 * Uses Web Crypto so the same code runs in the proxy and in route handlers.
 */

export const SESSION_COOKIE = "wm_couple";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Without a passcode configured (e.g. local development) the lock is off. */
export function lockEnabled() {
  return !!process.env.COUPLE_PASSCODE;
}

async function hmac(key: string, message: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The cookie value. It is derived from the passcode plus a server-only secret,
 * so changing the passcode signs everyone out, and the cookie can't be forged.
 */
export function sessionToken() {
  const secret = process.env.SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "wedding-memories";
  return hmac(`${secret}:${process.env.COUPLE_PASSCODE ?? ""}`, "wedding-memories-couple");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkPasscode(input: string) {
  return safeEqual(input.trim(), process.env.COUPLE_PASSCODE ?? "");
}

function cookieFrom(header: string | null) {
  return header
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
}

/** True when the request comes from the couple (or the lock is off). */
export async function isCouple(req: Request) {
  if (!lockEnabled()) return true;
  const value = cookieFrom(req.headers.get("cookie"));
  return !!value && safeEqual(value, await sessionToken());
}

/** For route handlers: a 401 response when the passcode is missing, else undefined. */
export async function requireCouple(req: Request) {
  if (await isCouple(req)) return undefined;
  return Response.json({ error: "Please enter the couple's passcode" }, { status: 401 });
}

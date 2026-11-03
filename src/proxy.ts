import { NextResponse, type NextRequest } from "next/server";
import { isCouple } from "@/features/memories/server/auth";

/**
 * Sends anyone without the couple's passcode cookie to /login before the
 * couple's pages render. Guest pages (/share/...) are never matched. The APIs
 * check the cookie themselves; this is only the friendly redirect.
 */
export async function proxy(request: NextRequest) {
  if (await isCouple(request)) return NextResponse.next();
  const login = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/", "/memories", "/memories/:path*"],
};

import { getFile } from "@/features/memories/server/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ folderId: string; name: string }> },
) {
  const { folderId, name } = await ctx.params;
  const file = await getFile(folderId, name);
  if (!file) return new Response("Not found", { status: 404 });
  if ("redirect" in file) {
    // Short-lived signed URL; let the browser reuse it for a while.
    return new Response(null, {
      status: 302,
      headers: { Location: file.redirect, "Cache-Control": "private, max-age=1800" },
    });
  }
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

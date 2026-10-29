import { readFile } from "@/features/memories/server/store";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ folderId: string; name: string }> },
) {
  const { folderId, name } = await ctx.params;
  const file = await readFile(folderId, name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

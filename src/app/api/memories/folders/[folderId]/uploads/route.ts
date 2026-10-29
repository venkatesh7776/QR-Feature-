import { NextResponse } from "next/server";
import { directUploads, getFolder, planUploads } from "@/features/memories/server/store";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 30;

/**
 * Step 1 of a submission. With Supabase, returns one-time signed URLs so the
 * browser can upload files directly (bypassing serverless body limits).
 * Locally, tells the client to send everything inline as multipart.
 */
export async function POST(req: Request, ctx: { params: Promise<{ folderId: string }> }) {
  if (!directUploads) return NextResponse.json({ mode: "inline" });

  const { folderId } = await ctx.params;
  if (!(await getFolder(folderId))) {
    return NextResponse.json({ error: "This memory folder no longer exists" }, { status: 404 });
  }

  const body = (await req.json()) as { files?: { photo?: string; voice?: string }[] };
  const files = (body.files ?? []).slice(0, MAX_ITEMS);
  if (!files.length || files.some((f) => !f.photo?.startsWith("image/") || (f.voice && !f.voice.startsWith("audio/")))) {
    return NextResponse.json({ error: "Only photos and audio voice notes can be uploaded" }, { status: 400 });
  }

  const uploads = await planUploads(
    folderId,
    files.map((f) => ({ photo: f.photo!, voice: f.voice || undefined })),
  );
  return NextResponse.json({ mode: "direct", uploads });
}

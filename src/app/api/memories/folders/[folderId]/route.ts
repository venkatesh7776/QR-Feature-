import { NextResponse } from "next/server";
import { requireCouple } from "@/features/memories/server/auth";
import { deleteFolder, getFolder, listMemories } from "@/features/memories/server/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await ctx.params;
  const folder = await getFolder(folderId);
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  return NextResponse.json({ folder, memories: await listMemories(folderId) });
}

/** Deletes the folder, every memory in it, and all their files. */
export async function DELETE(req: Request, ctx: { params: Promise<{ folderId: string }> }) {
  const denied = await requireCouple(req);
  if (denied) return denied;
  const { folderId } = await ctx.params;
  if (!(await deleteFolder(folderId))) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

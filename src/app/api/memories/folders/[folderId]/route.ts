import { NextResponse } from "next/server";
import { getFolder, listMemories } from "@/features/memories/server/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await ctx.params;
  const folder = await getFolder(folderId);
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  return NextResponse.json({ folder, memories: await listMemories(folderId) });
}

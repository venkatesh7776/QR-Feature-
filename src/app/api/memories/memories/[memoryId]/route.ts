import { NextResponse } from "next/server";
import { deleteMemory } from "@/features/memories/server/store";

export const dynamic = "force-dynamic";

/** Deletes one photo, with its note, reactions and voice note. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ memoryId: string }> }) {
  const { memoryId } = await ctx.params;
  if (!(await deleteMemory(memoryId))) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

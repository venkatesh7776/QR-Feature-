import { NextResponse } from "next/server";
import { addReaction } from "@/features/memories/server/store";
import { isEmoji } from "@/features/memories/lib/emoji";

export async function POST(req: Request, ctx: { params: Promise<{ memoryId: string }> }) {
  const { memoryId } = await ctx.params;
  const { emoji } = (await req.json()) as { emoji?: string };
  if (!emoji || !isEmoji(emoji)) {
    return NextResponse.json({ error: "Unsupported reaction" }, { status: 400 });
  }
  try {
    return NextResponse.json(await addReaction(memoryId, emoji));
  } catch {
    return NextResponse.json({ error: "Memory not found" }, { status: 404 });
  }
}

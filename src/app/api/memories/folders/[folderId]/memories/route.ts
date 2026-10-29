import { NextResponse } from "next/server";
import { addMemories, getFolder, type NewMemory } from "@/features/memories/server/store";
import { isEmoji } from "@/features/memories/lib/emoji";
import type { Reactions } from "@/features/memories/lib/types";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 30;

/**
 * Multipart body:
 *   source       "guest" | "couple"
 *   guestName    optional
 *   count        number of items
 *   photo.{i}    image file (required)
 *   message.{i}  optional text
 *   reactions.{i} optional JSON array of emoji
 *   voice.{i}    optional audio file
 */
export async function POST(req: Request, ctx: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await ctx.params;
  if (!(await getFolder(folderId))) {
    return NextResponse.json({ error: "This memory folder no longer exists" }, { status: 404 });
  }

  const form = await req.formData();
  const source = form.get("source") === "couple" ? "couple" : "guest";
  const guestName = text(form.get("guestName"), 60);
  const count = Math.min(Number(form.get("count")) || 0, MAX_ITEMS);

  const items: NewMemory[] = [];
  for (let i = 0; i < count; i++) {
    const photo = form.get(`photo.${i}`);
    if (!(photo instanceof File) || !photo.type.startsWith("image/")) continue;
    const voice = form.get(`voice.${i}`);
    items.push({
      source,
      photo,
      guestName,
      message: text(form.get(`message.${i}`), 1000),
      reactions: parseReactions(form.get(`reactions.${i}`)),
      voiceNote: voice instanceof File && voice.size > 0 ? voice : undefined,
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "Please include at least one photo" }, { status: 400 });
  }

  const memories = await addMemories(folderId, items);
  return NextResponse.json({ memories }, { status: 201 });
}

function text(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function parseReactions(value: FormDataEntryValue | null): Reactions {
  if (typeof value !== "string") return {};
  try {
    const list = JSON.parse(value) as unknown;
    if (!Array.isArray(list)) return {};
    return Object.fromEntries(
      list
        .filter((e): e is string => typeof e === "string" && isEmoji(e))
        .slice(0, 20)
        .map((e) => [e, 1]),
    );
  } catch {
    return {};
  }
}

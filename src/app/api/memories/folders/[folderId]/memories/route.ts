import { NextResponse } from "next/server";
import {
  addMemories,
  addUploadedMemories,
  directUploads,
  getFolder,
  type NewMemory,
} from "@/features/memories/server/store";
import { isEmoji } from "@/features/memories/lib/emoji";
import type { Reactions } from "@/features/memories/lib/types";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 30;

/**
 * Step 2 of a submission (see ../uploads). Two body formats:
 *
 * JSON, after direct uploads to storage:
 *   { source, guestName?, items: [{ id, photoName, voiceName?, message?, reactions? }] }
 *
 * Multipart, for the local backend:
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

  if (req.headers.get("content-type")?.includes("application/json")) {
    if (!directUploads) return NextResponse.json({ error: "Unsupported" }, { status: 400 });
    return submitUploaded(folderId, await req.json());
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

async function submitUploaded(
  folderId: string,
  body: {
    source?: string;
    guestName?: string;
    items?: { id?: string; photoName?: string; voiceName?: string; message?: string; reactions?: unknown }[];
  },
) {
  const items = (body.items ?? []).slice(0, MAX_ITEMS).filter((i) => i.id && i.photoName);
  if (!items.length) {
    return NextResponse.json({ error: "Please include at least one photo" }, { status: 400 });
  }
  try {
    const memories = await addUploadedMemories(
      folderId,
      body.source === "couple" ? "couple" : "guest",
      text(body.guestName ?? null, 60),
      items.map((i) => ({
        id: i.id!,
        photoName: i.photoName!,
        voiceName: i.voiceName || undefined,
        message: text(i.message ?? null, 1000),
        reactions: parseReactions(JSON.stringify(i.reactions ?? [])),
      })),
    );
    return NextResponse.json({ memories }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
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

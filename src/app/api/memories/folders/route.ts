import { NextResponse } from "next/server";
import { createFolder, listFolders } from "@/features/memories/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listFolders());
}

export async function POST(req: Request) {
  const body = (await req.json()) as { name?: string; date?: string; type?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
  }
  const type = body.type?.trim().slice(0, 40) || undefined;
  const folder = await createFolder({ name: name.slice(0, 80), date: body.date, type });
  return NextResponse.json(folder, { status: 201 });
}

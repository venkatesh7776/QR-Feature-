import type { Metadata } from "next";
import { GuestUpload } from "@/features/memories";

export const metadata: Metadata = { title: "Share your memories" };

export default async function GuestPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;
  return <GuestUpload folderId={folderId} />;
}

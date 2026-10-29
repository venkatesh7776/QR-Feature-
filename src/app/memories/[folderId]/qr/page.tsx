import { QrStudio } from "@/features/memories";

export default async function QrPage({ params }: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await params;
  return <QrStudio folderId={folderId} />;
}

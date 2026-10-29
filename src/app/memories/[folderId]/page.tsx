import { FolderView } from "@/features/memories";

export default async function FolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ folderId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { folderId } = await params;
  const { created } = await searchParams;
  return <FolderView folderId={folderId} justCreated={created === "1"} />;
}

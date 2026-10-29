export interface Folder {
  id: string;
  name: string;
  date?: string; // ISO date (yyyy-mm-dd)
  type?: string;
  createdAt: string;
}

export type Reactions = Record<string, number>;

export interface Memory {
  id: string;
  folderId: string;
  source: "guest" | "couple";
  photoUrl: string;
  message?: string;
  guestName?: string;
  reactions: Reactions;
  voiceNoteUrl?: string;
  createdAt: string;
}

export interface FolderSummary extends Folder {
  photoCount: number;
  /** Most recent photos first, for the folder thumbnail. */
  previewUrls: string[];
}

export const PLATFORMS = [
  "linkedin",
  "x",
  "instagram",
  "github",
  "youtube",
  "tiktok",
  "bsky",
  "threads",
  "website",
  "email",
  "other",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export type ContactCard = {
  id: string;
  url: string;
  platform: Platform;
  name: string;
  handle: string;
  note: string;
  title: string;
  description: string;
  image: string | null;
  avatar: string | null;
  createdAt: string;
  ownerHash: string;
};

export type PublicCard = Omit<ContactCard, "ownerHash">;

export type UnfurlResult = {
  url: string;
  platform: Platform;
  name: string;
  handle: string;
  title: string;
  description: string;
  image: string | null;
  avatar: string | null;
};

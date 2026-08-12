import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Redis } from "@upstash/redis";
import { list, put } from "@vercel/blob";
import type { ContactCard, PublicCard } from "./types";

const KEY = "cafe-cursor:cards";
const BLOB_PREFIX = "cafe-cursor-contacts";
const FILE_PATH = path.join(process.cwd(), ".data", "contacts.json");
const MAX_CARDS = 400;

function redis(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newOwnerToken(): string {
  return randomBytes(18).toString("base64url");
}

export function toPublic(card: ContactCard): PublicCard {
  return {
    id: card.id,
    url: card.url,
    platform: card.platform,
    name: card.name,
    handle: card.handle,
    note: card.note,
    title: card.title,
    description: card.description,
    image: card.image,
    avatar: card.avatar,
    createdAt: card.createdAt,
  };
}

async function readFileStore(): Promise<ContactCard[]> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as ContactCard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeFileStore(cards: ContactCard[]): Promise<void> {
  await mkdir(path.dirname(FILE_PATH), { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(cards, null, 2));
}

async function readBlobStore(): Promise<ContactCard[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 40 });
    if (!blobs.length) return [];
    // Prefer the newest object. Overwriting one pathname stays CDN-stale for
    // at least a minute on Blob, so each write uses a fresh pathname.
    const blob = [...blobs].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )[0];
    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) return [];
    const parsed = (await res.json()) as ContactCard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeBlobStore(cards: ContactCard[]): Promise<void> {
  await put(`${BLOB_PREFIX}/${Date.now()}.json`, JSON.stringify(cards), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    cacheControlMaxAge: 60,
  });
}

export function storageMode(): "redis" | "blob" | "file" {
  if (redis()) return "redis";
  if (hasBlob()) return "blob";
  return "file";
}

export async function listCards(): Promise<ContactCard[]> {
  const r = redis();
  if (r) {
    const rows = (await r.hvals(KEY)) as unknown[];
    const cards = rows
      .map((row): ContactCard | null => {
        if (!row) return null;
        if (typeof row === "string") return JSON.parse(row) as ContactCard;
        return row as ContactCard;
      })
      .filter((c): c is ContactCard => Boolean(c?.id));
    return cards.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  if (hasBlob()) {
    return (await readBlobStore()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  return (await readFileStore()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addCard(card: ContactCard): Promise<ContactCard> {
  if (process.env.VERCEL && storageMode() === "file") {
    throw new Error(
      "Add Upstash Redis or Blob storage in Vercel so cards persist across the room.",
    );
  }
  const existing = await listCards();
  if (existing.length >= MAX_CARDS) {
    throw new Error("The wall is full for this cafe.");
  }
  const dup = existing.find(
    (c) => c.url.replace(/\/$/, "") === card.url.replace(/\/$/, ""),
  );
  if (dup) {
    throw new Error("That link is already on the wall.");
  }

  const r = redis();
  if (r) {
    await r.hset(KEY, { [card.id]: card });
    return card;
  }
  const next = [card, ...existing];
  if (hasBlob()) await writeBlobStore(next);
  else await writeFileStore(next);
  return card;
}

export async function removeCard(id: string, token: string): Promise<boolean> {
  const hash = hashToken(token);
  const r = redis();
  if (r) {
    const card = await r.hget<ContactCard>(KEY, id);
    if (!card || card.ownerHash !== hash) return false;
    await r.hdel(KEY, id);
    return true;
  }
  const cards = hasBlob() ? await readBlobStore() : await readFileStore();
  const card = cards.find((c) => c.id === id);
  if (!card || card.ownerHash !== hash) return false;
  const next = cards.filter((c) => c.id !== id);
  if (hasBlob()) await writeBlobStore(next);
  else await writeFileStore(next);
  return true;
}

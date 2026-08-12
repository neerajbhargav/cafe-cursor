import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { detectPlatform, isAllowedUrl } from "@/lib/platforms";
import { addCard, hashToken, listCards, newOwnerToken, toPublic } from "@/lib/store";
import type { ContactCard } from "@/lib/types";
import { unfurl } from "@/lib/unfurl";

export const dynamic = "force-dynamic";

const hits = new Map<string, { n: number; t: number }>();

function ip(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const row = hits.get(key);
  if (!row || now - row.t > windowMs) {
    hits.set(key, { n: 1, t: now });
    return false;
  }
  row.n += 1;
  return row.n > max;
}

export async function GET() {
  const cards = await listCards();
  return NextResponse.json({ cards: cards.map(toPublic) });
}

export async function POST(req: NextRequest) {
  if (limited(`post:${ip(req)}`, 8, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Slow down a bit, then drop another." }, { status: 429 });
  }

  let body: { url?: string; name?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }

  const url = (body.url || "").trim();
  if (!url || !isAllowedUrl(url)) {
    return NextResponse.json({ error: "Paste a real http, https, or mailto link." }, { status: 400 });
  }
  if (url.length > 500) {
    return NextResponse.json({ error: "That link is too long." }, { status: 400 });
  }

  const name = (body.name || "").trim().slice(0, 80);
  const note = (body.note || "").trim().slice(0, 140);

  try {
    const meta = await unfurl(url);
    const token = newOwnerToken();
    const card: ContactCard = {
      id: randomUUID(),
      url: meta.url,
      platform: meta.platform || detectPlatform(url),
      name: name || meta.name,
      handle: meta.handle,
      note,
      title: meta.title,
      description: meta.description,
      image: meta.image,
      avatar: meta.avatar,
      createdAt: new Date().toISOString(),
      ownerHash: hashToken(token),
    };
    await addCard(card);
    return NextResponse.json({ card: toPublic(card), token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save that card.";
    const status = message.includes("already") || message.includes("full") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

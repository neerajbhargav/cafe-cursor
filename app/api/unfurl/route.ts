import { NextRequest, NextResponse } from "next/server";
import { isAllowedUrl, normalizeUrl } from "@/lib/platforms";
import { unfurl } from "@/lib/unfurl";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { url?: string };
  const url = normalizeUrl(body.url || "");
  if (!url || !isAllowedUrl(url)) {
    return NextResponse.json({ error: "Paste a real link." }, { status: 400 });
  }
  const meta = await unfurl(url);
  return NextResponse.json(meta);
}

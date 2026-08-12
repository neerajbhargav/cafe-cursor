import { NextRequest, NextResponse } from "next/server";
import { removeCard } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = (body.token || "").trim();
  if (!id || !token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }
  const ok = await removeCard(id, token);
  if (!ok) return NextResponse.json({ error: "Not your card." }, { status: 403 });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { isLinkedInConfigured } from "@/lib/env";
import { clearSession, publicSession, readSession } from "@/lib/session";

export async function GET() {
  const session = await readSession();
  return NextResponse.json({
    configured: isLinkedInConfigured(),
    user: publicSession(session),
  });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}

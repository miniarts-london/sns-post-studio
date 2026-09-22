import { NextResponse } from "next/server";
import { isFacebookConfigured } from "@/lib/env";
import { listFacebookPages } from "@/lib/facebook";
import {
  clearFacebookSession,
  publicFacebookSession,
  readFacebookSession,
} from "@/lib/session";

export async function GET() {
  const session = await readFacebookSession();
  const pages = session ? await listFacebookPages(session.accessToken).catch(() => []) : [];
  return NextResponse.json({
    configured: isFacebookConfigured(),
    user: publicFacebookSession(session),
    pages,
  });
}

export async function DELETE() {
  await clearFacebookSession();
  return NextResponse.json({ ok: true });
}

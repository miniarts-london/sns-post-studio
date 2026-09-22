import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isLinkedInConfigured } from "@/lib/env";
import { linkedInAuthUrl } from "@/lib/linkedin";
import { writeOAuthState } from "@/lib/session";

export async function GET(request: NextRequest) {
  if (!isLinkedInConfigured()) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "error=linkedin-setup";
    return NextResponse.redirect(url);
  }

  const state = randomBytes(16).toString("hex");
  await writeOAuthState(state);
  return NextResponse.redirect(linkedInAuthUrl(state));
}

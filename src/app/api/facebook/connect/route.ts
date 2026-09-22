import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isFacebookConfigured } from "@/lib/env";
import { facebookAuthUrl } from "@/lib/facebook";
import {
  FACEBOOK_OAUTH_STATE_COOKIE,
  writeOAuthState,
} from "@/lib/session";

export async function GET(request: NextRequest) {
  if (!isFacebookConfigured()) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "error=facebook-setup";
    return NextResponse.redirect(url);
  }

  const state = randomBytes(16).toString("hex");
  await writeOAuthState(state, FACEBOOK_OAUTH_STATE_COOKIE);
  return NextResponse.redirect(facebookAuthUrl(state));
}

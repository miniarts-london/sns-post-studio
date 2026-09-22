import { NextRequest, NextResponse } from "next/server";
import {
  exchangeFacebookCode,
  FacebookApiError,
  getFacebookUser,
} from "@/lib/facebook";
import {
  FACEBOOK_OAUTH_STATE_COOKIE,
  consumeOAuthState,
  writeFacebookSession,
} from "@/lib/session";

function home(request: NextRequest, query: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expected = await consumeOAuthState(FACEBOOK_OAUTH_STATE_COOKIE);

  if (error) {
    return NextResponse.redirect(home(request, { error: "facebook-denied" }));
  }

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(home(request, { error: "facebook-state" }));
  }

  try {
    const token = await exchangeFacebookCode(code);
    const user = await getFacebookUser(token.accessToken);
    await writeFacebookSession({
      accessToken: token.accessToken,
      userId: user.userId,
      name: user.name,
      expiresAt: token.expiresAt,
    });
    return NextResponse.redirect(home(request, { connected: "facebook" }));
  } catch (caught) {
    const message =
      caught instanceof FacebookApiError
        ? caught.message
        : "Could not connect Facebook.";
    return NextResponse.redirect(
      home(request, { error: "facebook-token", detail: message }),
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeLinkedInCode,
  getLinkedInUser,
  LinkedInApiError,
} from "@/lib/linkedin";
import { consumeOAuthState, writeSession } from "@/lib/session";

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
  const expected = await consumeOAuthState();

  if (error) {
    return NextResponse.redirect(
      home(request, { error: "linkedin-denied" }),
    );
  }

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(
      home(request, { error: "linkedin-state" }),
    );
  }

  try {
    const token = await exchangeLinkedInCode(code);
    const user = await getLinkedInUser(token.access_token);
    await writeSession({
      accessToken: token.access_token,
      personUrn: user.personUrn,
      name: user.name,
      expiresAt: Date.now() + token.expires_in * 1000,
    });
    return NextResponse.redirect(home(request, { connected: "1" }));
  } catch (caught) {
    const message =
      caught instanceof LinkedInApiError
        ? caught.message
        : "Could not connect LinkedIn.";
    return NextResponse.redirect(
      home(request, { error: "linkedin-token", detail: message }),
    );
  }
}

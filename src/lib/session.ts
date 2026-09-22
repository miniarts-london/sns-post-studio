import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sessionSecret } from "@/lib/env";

export const SESSION_COOKIE = "li_session";
export const FACEBOOK_SESSION_COOKIE = "fb_session";
export const OAUTH_STATE_COOKIE = "li_oauth_state";
export const FACEBOOK_OAUTH_STATE_COOKIE = "fb_oauth_state";

export type LinkedInSession = {
  accessToken: string;
  personUrn: string;
  name: string;
  expiresAt: number;
};

export type FacebookSession = {
  accessToken: string;
  userId: string;
  name: string;
  expiresAt: number;
};

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function encode(session: LinkedInSession | FacebookSession) {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url",
  );
  return `${payload}.${sign(payload, sessionSecret())}`;
}

function decodePayload(value: string): unknown | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function isLinkedInSession(value: unknown): value is LinkedInSession {
  if (!value || typeof value !== "object") return false;
  const session = value as LinkedInSession;
  return (
    typeof session.accessToken === "string" &&
    typeof session.personUrn === "string" &&
    typeof session.name === "string" &&
    typeof session.expiresAt === "number" &&
    session.expiresAt > Date.now()
  );
}

function isFacebookSession(value: unknown): value is FacebookSession {
  if (!value || typeof value !== "object") return false;
  const session = value as FacebookSession;
  return (
    typeof session.accessToken === "string" &&
    typeof session.userId === "string" &&
    typeof session.name === "string" &&
    typeof session.expiresAt === "number" &&
    session.expiresAt > Date.now()
  );
}

function decode(value: string): LinkedInSession | null {
  const session = decodePayload(value);
  return isLinkedInSession(session) ? session : null;
}

function decodeFacebook(value: string): FacebookSession | null {
  const session = decodePayload(value);
  return isFacebookSession(session) ? session : null;
}

export async function readSession(): Promise<LinkedInSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decode(raw);
}

export async function writeSession(session: LinkedInSession) {
  const store = await cookies();
  const maxAge = Math.max(
    60,
    Math.floor((session.expiresAt - Date.now()) / 1000),
  );
  store.set(SESSION_COOKIE, encode(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function writeOAuthState(
  state: string,
  cookieName = OAUTH_STATE_COOKIE,
) {
  const store = await cookies();
  store.set(cookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
}

export async function consumeOAuthState(cookieName = OAUTH_STATE_COOKIE) {
  const store = await cookies();
  const state = store.get(cookieName)?.value ?? null;
  store.delete(cookieName);
  return state;
}

export async function readFacebookSession(): Promise<FacebookSession | null> {
  const store = await cookies();
  const raw = store.get(FACEBOOK_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decodeFacebook(raw);
}

export async function writeFacebookSession(session: FacebookSession) {
  const store = await cookies();
  const maxAge = Math.max(
    60,
    Math.floor((session.expiresAt - Date.now()) / 1000),
  );
  store.set(FACEBOOK_SESSION_COOKIE, encode(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearFacebookSession() {
  const store = await cookies();
  store.delete(FACEBOOK_SESSION_COOKIE);
}

export function publicSession(session: LinkedInSession | null) {
  if (!session) return null;
  return { name: session.name };
}

export function publicFacebookSession(session: FacebookSession | null) {
  if (!session) return null;
  return { name: session.name };
}

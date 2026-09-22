import { facebookConfig } from "@/lib/env";

const GRAPH_VERSION = "v22.0";
const DIALOG_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const TOKEN_URL = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`;
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

const SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
].join(",");

export type FacebookPage = {
  id: string;
  name: string;
};

type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type MeResponse = {
  id: string;
  name?: string;
};

type AccountsResponse = {
  data?: {
    id: string;
    name: string;
    access_token: string;
    tasks?: string[];
  }[];
};

export class FacebookApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FacebookApiError";
    this.status = status;
  }
}

async function readError(response: Response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as {
      error?: { message?: string; error_user_msg?: string };
      error_description?: string;
    };
    return (
      json.error?.error_user_msg ||
      json.error?.message ||
      json.error_description ||
      text ||
      response.statusText
    );
  } catch {
    return text || response.statusText;
  }
}

async function graphGet<T>(path: string, accessToken: string) {
  const url = new URL(`${GRAPH_URL}${path}`);
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url);
  if (!response.ok) {
    throw new FacebookApiError(await readError(response), response.status);
  }
  return (await response.json()) as T;
}

export function facebookAuthUrl(state: string) {
  const { appId, redirectUri } = facebookConfig();
  const url = new URL(DIALOG_URL);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export async function exchangeFacebookCode(code: string) {
  const { appId, appSecret, redirectUri } = facebookConfig();
  const url = new URL(TOKEN_URL);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const response = await fetch(url);
  if (!response.ok) {
    throw new FacebookApiError(await readError(response), response.status);
  }
  const shortLived = (await response.json()) as TokenResponse;
  return lengthenFacebookToken(shortLived);
}

async function lengthenFacebookToken(token: TokenResponse) {
  const { appId, appSecret } = facebookConfig();
  const url = new URL(TOKEN_URL);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", token.access_token);

  const response = await fetch(url);
  if (!response.ok) {
    return {
      accessToken: token.access_token,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
    };
  }

  const longLived = (await response.json()) as TokenResponse;
  return {
    accessToken: longLived.access_token,
    expiresAt:
      Date.now() + (longLived.expires_in ?? token.expires_in ?? 3600) * 1000,
  };
}

export async function getFacebookUser(accessToken: string) {
  const me = await graphGet<MeResponse>("/me?fields=id,name", accessToken);
  return {
    userId: me.id,
    name: me.name || "Facebook user",
  };
}

async function pageAccounts(accessToken: string) {
  const json = await graphGet<AccountsResponse>(
    "/me/accounts?fields=id,name,access_token,tasks",
    accessToken,
  );
  return (json.data ?? []).filter((page) => {
    const tasks = page.tasks ?? [];
    return (
      tasks.length === 0 ||
      tasks.includes("CREATE_CONTENT") ||
      tasks.includes("MANAGE")
    );
  });
}

export async function listFacebookPages(
  accessToken: string,
): Promise<FacebookPage[]> {
  const pages = await pageAccounts(accessToken);
  return pages.map((page) => ({ id: page.id, name: page.name }));
}

async function pageAccessToken(accessToken: string, pageId: string) {
  const page = (await pageAccounts(accessToken)).find(
    (entry) => entry.id === pageId,
  );
  if (!page) {
    throw new FacebookApiError(
      "That Facebook Page is not available on this account.",
      403,
    );
  }
  return page;
}

async function pagePermalink(
  id: string,
  pageToken: string,
  pageId: string,
) {
  try {
    const json = await graphGet<{ permalink_url?: string }>(
      `/${id}?fields=permalink_url`,
      pageToken,
    );
    if (json.permalink_url) return json.permalink_url;
  } catch {
    // Fall back to the Page itself if Graph does not return a permalink.
  }
  return `https://www.facebook.com/${pageId}`;
}

export async function publishFacebookPost(options: {
  accessToken: string;
  pageId: string;
  message: string;
  image?: { bytes: ArrayBuffer; type: string; name: string };
}) {
  const page = await pageAccessToken(options.accessToken, options.pageId);
  const auth = { Authorization: `Bearer ${page.access_token}` };

  if (options.image) {
    const form = new FormData();
    form.set("message", options.message);
    form.set("published", "true");
    form.set(
      "source",
      new File([new Uint8Array(options.image.bytes)], options.image.name, {
        type: options.image.type,
      }),
    );

    const response = await fetch(`${GRAPH_URL}/${page.id}/photos`, {
      method: "POST",
      headers: auth,
      body: form,
    });
    if (!response.ok) {
      throw new FacebookApiError(await readError(response), response.status);
    }
    const json = (await response.json()) as { id?: string; post_id?: string };
    const postId = json.post_id || json.id || "";
    return {
      postId,
      pageName: page.name,
      url: postId
        ? await pagePermalink(postId, page.access_token, page.id)
        : `https://www.facebook.com/${page.id}`,
    };
  }

  const body = new URLSearchParams({
    message: options.message,
    published: "true",
  });
  const response = await fetch(`${GRAPH_URL}/${page.id}/feed`, {
    method: "POST",
    headers: {
      ...auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) {
    throw new FacebookApiError(await readError(response), response.status);
  }
  const json = (await response.json()) as { id?: string };
  const postId = json.id || "";
  return {
    postId,
    pageName: page.name,
    url: postId
      ? await pagePermalink(postId, page.access_token, page.id)
      : `https://www.facebook.com/${page.id}`,
  };
}

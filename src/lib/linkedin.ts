import { linkedInConfig } from "@/lib/env";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const REGISTER_UPLOAD_URL =
  "https://api.linkedin.com/v2/assets?action=registerUpload";
const UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts";

const SCOPES = ["openid", "profile", "email", "w_member_social"].join(" ");

type TokenResponse = {
  access_token: string;
  expires_in: number;
};

type UserInfo = {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
};

type RegisterUploadResponse = {
  value?: {
    asset?: string;
    uploadMechanism?: {
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: {
        uploadUrl?: string;
      };
    };
  };
};

export class LinkedInApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "LinkedInApiError";
    this.status = status;
  }
}

async function readError(response: Response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as {
      message?: string;
      error_description?: string;
      error?: string;
    };
    return (
      json.message ||
      json.error_description ||
      json.error ||
      text ||
      response.statusText
    );
  } catch {
    return text || response.statusText;
  }
}

export function linkedInAuthUrl(state: string) {
  const { clientId, redirectUri } = linkedInConfig();
  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeLinkedInCode(code: string) {
  const { clientId, clientSecret, redirectUri } = linkedInConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new LinkedInApiError(await readError(response), response.status);
  }

  return (await response.json()) as TokenResponse;
}

export async function getLinkedInUser(accessToken: string) {
  const response = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new LinkedInApiError(await readError(response), response.status);
  }
  const user = (await response.json()) as UserInfo;
  const name =
    user.name ||
    [user.given_name, user.family_name].filter(Boolean).join(" ") ||
    "LinkedIn member";
  return {
    personUrn: `urn:li:person:${user.sub}`,
    name,
  };
}

async function registerImageUpload(accessToken: string, personUrn: string) {
  const response = await fetch(REGISTER_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: personUrn,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    throw new LinkedInApiError(await readError(response), response.status);
  }

  const json = (await response.json()) as RegisterUploadResponse;
  const asset = json.value?.asset;
  const uploadUrl =
    json.value?.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]?.uploadUrl;

  if (!asset || !uploadUrl) {
    throw new LinkedInApiError(
      "LinkedIn did not return an image upload URL.",
      502,
    );
  }

  return { asset, uploadUrl };
}

async function uploadImageBinary(
  uploadUrl: string,
  accessToken: string,
  bytes: ArrayBuffer,
) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });

  if (!response.ok) {
    throw new LinkedInApiError(await readError(response), response.status);
  }
}

export async function publishLinkedInPost(options: {
  accessToken: string;
  personUrn: string;
  commentary: string;
  image?: { bytes: ArrayBuffer; title?: string };
}) {
  let media:
    | {
        status: "READY";
        media: string;
        title?: { text: string };
      }[]
    | undefined;

  if (options.image) {
    const { asset, uploadUrl } = await registerImageUpload(
      options.accessToken,
      options.personUrn,
    );
    await uploadImageBinary(
      uploadUrl,
      options.accessToken,
      options.image.bytes,
    );
    media = [
      {
        status: "READY",
        media: asset,
        title: options.image.title
          ? { text: options.image.title }
          : undefined,
      },
    ];
  }

  const response = await fetch(UGC_POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: options.personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: options.commentary },
          shareMediaCategory: media ? "IMAGE" : "NONE",
          ...(media ? { media } : {}),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!response.ok) {
    throw new LinkedInApiError(await readError(response), response.status);
  }

  const postId = response.headers.get("x-restli-id") || "";
  return {
    postId,
    url: postId
      ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`
      : "https://www.linkedin.com/feed/",
  };
}

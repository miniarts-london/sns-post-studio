import { Composer } from "@/components/Composer";
import {
  isAnthropicConfigured,
  isFacebookConfigured,
  isLinkedInConfigured,
} from "@/lib/env";
import { listFacebookPages } from "@/lib/facebook";
import {
  publicFacebookSession,
  publicSession,
  readFacebookSession,
  readSession,
} from "@/lib/session";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const [session, facebookSession, params] = await Promise.all([
    readSession(),
    readFacebookSession(),
    searchParams,
  ]);

  const facebookPages = facebookSession
    ? await listFacebookPages(facebookSession.accessToken).catch(() => [])
    : [];

  return (
    <Composer
      linkedInUser={publicSession(session)}
      linkedInConfigured={isLinkedInConfigured()}
      facebookUser={publicFacebookSession(facebookSession)}
      facebookPages={facebookPages}
      facebookConfigured={isFacebookConfigured()}
      anthropicConfigured={isAnthropicConfigured()}
      connected={first(params.connected) ?? null}
      oauthError={first(params.error) ?? null}
      oauthDetail={first(params.detail) ?? null}
    />
  );
}

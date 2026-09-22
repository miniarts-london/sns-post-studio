function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

export function anthropicConfig() {
  return {
    apiKey: required("ANTHROPIC_API_KEY"),
    model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5",
  };
}

export function linkedInConfig() {
  return {
    clientId: required("LINKEDIN_CLIENT_ID"),
    clientSecret: required("LINKEDIN_CLIENT_SECRET"),
    redirectUri:
      process.env.LINKEDIN_REDIRECT_URI?.trim() ||
      "http://localhost:3000/api/linkedin/callback",
  };
}

export function sessionSecret() {
  return required("SESSION_SECRET");
}

export function facebookConfig() {
  return {
    appId: required("FACEBOOK_APP_ID"),
    appSecret: required("FACEBOOK_APP_SECRET"),
    redirectUri:
      process.env.FACEBOOK_REDIRECT_URI?.trim() ||
      "http://localhost:3000/api/facebook/callback",
  };
}

export function isLinkedInConfigured() {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID?.trim() &&
      process.env.LINKEDIN_CLIENT_SECRET?.trim() &&
      process.env.SESSION_SECRET?.trim(),
  );
}

export function isFacebookConfigured() {
  return Boolean(
    process.env.FACEBOOK_APP_ID?.trim() &&
      process.env.FACEBOOK_APP_SECRET?.trim() &&
      process.env.SESSION_SECRET?.trim(),
  );
}

export function isAnthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

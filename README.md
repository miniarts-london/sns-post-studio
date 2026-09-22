# Post Studio

Draft a post with Claude, attach a photo, and publish it to LinkedIn or a Facebook Page.

## Run

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Keys

### Claude

1. Create an API key at [console.anthropic.com](https://console.anthropic.com/).
2. Set `ANTHROPIC_API_KEY` in `.env.local`.
3. Leave `ANTHROPIC_MODEL=claude-sonnet-5` unless you want a different model.

### LinkedIn

Publishing uses LinkedIn’s official Share on LinkedIn product, not browser automation.

1. Create a [LinkedIn developer app](https://www.linkedin.com/developers/apps). LinkedIn asks you to attach a company page (a placeholder page is enough).
2. Under **Auth**, add redirect URL `http://localhost:3000/api/linkedin/callback`.
3. Under **Products**, add **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect**.
4. Copy the client ID and client secret into `.env.local`.
5. Set `SESSION_SECRET` to any long random string.
6. Use the **Privacy** page URL (`http://localhost:3000/privacy`) if LinkedIn asks for a privacy policy.

### Facebook

Publishing uses the official Graph API. Facebook does not allow third-party apps to post to a personal profile, so this posts as a **Page you manage**.

1. Create an app at [developers.facebook.com](https://developers.facebook.com/apps/). A Business type app is the usual choice.
2. Add the **Facebook Login** product.
3. Under Facebook Login settings, add Valid OAuth Redirect URI `http://localhost:3000/api/facebook/callback`.
4. Copy the App ID and App Secret into `.env.local` as `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`.
5. In development mode, add yourself as an app admin or tester, and use a Page you admin.
6. Posting to other people’s Pages later needs App Review for `pages_show_list`, `pages_manage_posts`, and `pages_read_engagement`.

After that, generate a draft, pick a photo, then **Post to LinkedIn** and/or **Post to Facebook**.

## What it does not do

- It does not post as a LinkedIn company page (`w_organization_social` needs extra LinkedIn approval).
- It does not post to a personal Facebook profile.
- It does not scrape LinkedIn or Facebook or drive those websites.
# sns-post-studio

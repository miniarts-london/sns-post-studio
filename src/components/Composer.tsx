"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "conversational", label: "Conversational" },
  { id: "thought-leadership", label: "Thought leadership" },
  { id: "story", label: "Story" },
] as const;

const LIMIT = 3000;

type Account = { name: string } | null;
type FacebookPage = { id: string; name: string };

type Banner =
  | { kind: "success"; text: string; href?: string; hrefLabel?: string }
  | { kind: "error"; text: string }
  | null;

function bannerFromOAuth(
  connected: string | null,
  oauthError: string | null,
  oauthDetail: string | null,
): Banner {
  if (connected === "1" || connected === "linkedin") {
    return { kind: "success", text: "LinkedIn is connected. You can post." };
  }
  if (connected === "facebook") {
    return { kind: "success", text: "Facebook is connected. Choose a Page, then post." };
  }
  if (oauthError === "linkedin-setup") {
    return {
      kind: "error",
      text: "Add LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and SESSION_SECRET to .env.local.",
    };
  }
  if (oauthError === "facebook-setup") {
    return {
      kind: "error",
      text: "Add FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, and SESSION_SECRET to .env.local.",
    };
  }
  if (oauthError === "linkedin-denied") {
    return { kind: "error", text: "LinkedIn access was cancelled." };
  }
  if (oauthError === "facebook-denied") {
    return { kind: "error", text: "Facebook access was cancelled." };
  }
  if (oauthError === "linkedin-state" || oauthError === "facebook-state") {
    return { kind: "error", text: "Sign-in expired. Try connecting again." };
  }
  if (oauthError === "linkedin-token" || oauthError === "facebook-token") {
    return {
      kind: "error",
      text: oauthDetail || "Could not finish sign-in.",
    };
  }
  return null;
}

export function Composer({
  linkedInUser,
  linkedInConfigured,
  facebookUser,
  facebookPages,
  facebookConfigured,
  anthropicConfigured,
  connected,
  oauthError,
  oauthDetail,
}: {
  linkedInUser: Account;
  linkedInConfigured: boolean;
  facebookUser: Account;
  facebookPages: FacebookPage[];
  facebookConfigured: boolean;
  anthropicConfigured: boolean;
  connected: string | null;
  oauthError: string | null;
  oauthDetail: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>("professional");
  const [post, setPost] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [pageId, setPageId] = useState(facebookPages[0]?.id ?? "");
  const [generating, setGenerating] = useState(false);
  const [postingLinkedIn, setPostingLinkedIn] = useState(false);
  const [postingFacebook, setPostingFacebook] = useState(false);
  const [disconnectingLinkedIn, setDisconnectingLinkedIn] = useState(false);
  const [disconnectingFacebook, setDisconnectingFacebook] = useState(false);
  const [banner, setBanner] = useState<Banner>(() =>
    bannerFromOAuth(connected, oauthError, oauthDetail),
  );
  const [linkedin, setLinkedin] = useState<Account>(linkedInUser);
  const [facebook, setFacebook] = useState<Account>(facebookUser);

  const selectedPageId = pageId || facebookPages[0]?.id || "";

  const previewUrl = useMemo(
    () => (photo ? URL.createObjectURL(photo) : null),
    [photo],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function generate() {
    setGenerating(true);
    setBanner(null);
    try {
      const form = new FormData();
      form.set("topic", topic);
      form.set("tone", tone);
      if (photo) form.set("image", photo);
      const response = await fetch("/api/generate", { method: "POST", body: form });
      const data = (await response.json()) as { post?: string; error?: string };
      if (!response.ok || !data.post) {
        throw new Error(data.error || "Could not generate a post.");
      }
      setPost(data.post);
    } catch (error) {
      setBanner({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not generate a post.",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function publishLinkedIn() {
    setPostingLinkedIn(true);
    setBanner(null);
    try {
      const form = new FormData();
      form.set("commentary", post);
      if (photo) form.set("image", photo);
      const response = await fetch("/api/linkedin/post", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not publish the post.");
      }
      setBanner({
        kind: "success",
        text: "Posted to LinkedIn.",
        href: data.url,
        hrefLabel: "View on LinkedIn",
      });
    } catch (error) {
      setBanner({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not publish the post.",
      });
    } finally {
      setPostingLinkedIn(false);
    }
  }

  async function publishFacebook() {
    setPostingFacebook(true);
    setBanner(null);
    try {
      const form = new FormData();
      form.set("message", post);
      form.set("pageId", selectedPageId);
      if (photo) form.set("image", photo);
      const response = await fetch("/api/facebook/post", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as {
        url?: string;
        pageName?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Could not publish the Facebook post.");
      }
      setBanner({
        kind: "success",
        text: data.pageName
          ? `Posted to the Facebook Page “${data.pageName}”. It will not appear on your personal profile.`
          : "Posted to Facebook. Open the Page, not your personal profile.",
        href: data.url,
        hrefLabel: "Open the Page post",
      });
    } catch (error) {
      setBanner({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not publish the Facebook post.",
      });
    } finally {
      setPostingFacebook(false);
    }
  }

  async function disconnectLinkedIn() {
    setDisconnectingLinkedIn(true);
    await fetch("/api/linkedin/session", { method: "DELETE" });
    setLinkedin(null);
    setDisconnectingLinkedIn(false);
    router.refresh();
  }

  async function disconnectFacebook() {
    setDisconnectingFacebook(true);
    await fetch("/api/facebook/session", { method: "DELETE" });
    setFacebook(null);
    setPageId("");
    setDisconnectingFacebook(false);
    router.refresh();
  }

  function onPhoto(file: File | null) {
    if (!file) {
      setPhoto(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setBanner({ kind: "error", text: "Choose an image file." });
      return;
    }
    setPhoto(file);
  }

  const remaining = LIMIT - post.length;
  const canGenerate = topic.trim().length >= 8 && !generating;
  const canLinkedIn = Boolean(
    linkedin && post.trim() && !postingLinkedIn && remaining >= 0,
  );
  const canFacebook = Boolean(
    facebook && selectedPageId && post.trim() && !postingFacebook && remaining >= 0,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#0a66c2]">Post Studio</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#191919]">
            Draft with Claude, then post
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {linkedin ? (
            <div className="flex items-center gap-3 rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-sm">
              <span className="text-[#191919]">LinkedIn · {linkedin.name}</span>
              <button
                type="button"
                onClick={disconnectLinkedIn}
                disabled={disconnectingLinkedIn}
                className="text-[#666] underline-offset-2 hover:underline"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/api/linkedin/connect"
              className="inline-flex h-10 items-center rounded-full bg-[#0a66c2] px-4 text-sm font-semibold text-white hover:bg-[#004182]"
            >
              {linkedInConfigured ? "Connect LinkedIn" : "Connect LinkedIn (setup needed)"}
            </a>
          )}
          {facebook ? (
            <div className="flex items-center gap-3 rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-sm">
              <span className="text-[#191919]">Facebook · {facebook.name}</span>
              <button
                type="button"
                onClick={disconnectFacebook}
                disabled={disconnectingFacebook}
                className="text-[#666] underline-offset-2 hover:underline"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/api/facebook/connect"
              className="inline-flex h-10 items-center rounded-full bg-[#1877F2] px-4 text-sm font-semibold text-white hover:bg-[#0d65d9]"
            >
              {facebookConfigured ? "Connect Facebook" : "Connect Facebook (setup needed)"}
            </a>
          )}
        </div>
      </header>

      {banner ? (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            banner.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {banner.text}{" "}
          {banner.kind === "success" && banner.href ? (
            <a
              href={banner.href}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              {banner.hrefLabel || "View post"}
            </a>
          ) : null}
        </div>
      ) : null}

      {!anthropicConfigured ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Add <code className="font-mono">ANTHROPIC_API_KEY</code> to{" "}
          <code className="font-mono">.env.local</code> so Claude can write the post.
        </p>
      ) : null}

      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="flex flex-col gap-5 rounded-xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#191919]">
              What should this post be about?
            </span>
            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              rows={5}
              placeholder="A launch, a lesson from work, a take on something in your industry…"
              className="resize-y rounded-lg border border-[#cfcfcf] px-3 py-2 text-[15px] text-[#191919] outline-none focus:border-[#0a66c2]"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold text-[#191919]">Tone</legend>
            <div className="flex flex-wrap gap-2">
              {TONES.map((option) => (
                <label
                  key={option.id}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                    tone === option.id
                      ? "border-[#0a66c2] bg-[#e8f3ff] text-[#0a66c2]"
                      : "border-[#cfcfcf] bg-white text-[#191919]"
                  }`}
                >
                  <input
                    type="radio"
                    name="tone"
                    value={option.id}
                    checked={tone === option.id}
                    onChange={() => setTone(option.id)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#191919]">Photo</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(event) => onPhoto(event.target.files?.[0] ?? null)}
            />
            {photo && previewUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Selected photo"
                  className="h-16 w-16 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#191919]">{photo.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      onPhoto(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="text-sm text-[#666] underline-offset-2 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-dashed border-[#cfcfcf] px-4 py-6 text-sm text-[#666] hover:border-[#0a66c2] hover:text-[#0a66c2]"
              >
                Choose a photo to attach
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            className="h-11 rounded-full bg-[#191919] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#cfcfcf]"
          >
            {generating ? "Claude is writing…" : "Write with Claude"}
          </button>

          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between text-sm font-semibold text-[#191919]">
              Post
              <span className={remaining < 0 ? "text-red-600" : "font-normal text-[#666]"}>
                {remaining} left
              </span>
            </span>
            <textarea
              value={post}
              onChange={(event) => setPost(event.target.value.slice(0, LIMIT))}
              rows={12}
              placeholder="Your draft will appear here. Edit anything before you post."
              className="resize-y rounded-lg border border-[#cfcfcf] px-3 py-2 text-[15px] leading-6 text-[#191919] outline-none focus:border-[#0a66c2]"
            />
          </label>

          {facebook ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#191919]">
                Facebook Page
              </span>
              {facebookPages.length ? (
                <select
                  value={selectedPageId}
                  onChange={(event) => setPageId(event.target.value)}
                  className="h-11 rounded-lg border border-[#cfcfcf] bg-white px-3 text-[15px] text-[#191919] outline-none focus:border-[#1877F2]"
                >
                  {facebookPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  Facebook can only publish as a Page you manage, not to a personal
                  profile. Create a Page, then reconnect.
                </p>
              )}
            </label>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={publishLinkedIn}
              disabled={!canLinkedIn}
              className="h-11 rounded-full bg-[#0a66c2] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#cfcfcf]"
            >
              {postingLinkedIn
                ? "Posting to LinkedIn…"
                : linkedin
                  ? "Post to LinkedIn"
                  : "Connect LinkedIn to post"}
            </button>
            <button
              type="button"
              onClick={publishFacebook}
              disabled={!canFacebook}
              className="h-11 rounded-full bg-[#1877F2] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#cfcfcf]"
            >
              {postingFacebook
                ? "Posting to Facebook…"
                : facebook
                  ? "Post to Facebook"
                  : "Connect Facebook to post"}
            </button>
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-[#191919]">Preview</p>
          <article className="rounded-lg border border-[#e0e0e0]">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0a66c2] text-sm font-semibold text-white">
                {(linkedin?.name || facebook?.name || "You")
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#191919]">
                  {linkedin?.name || facebook?.name || "You"}
                </p>
                <p className="text-xs text-[#666]">Same draft for LinkedIn and Facebook · Now</p>
              </div>
            </div>
            <div className="whitespace-pre-wrap px-4 pb-3 text-[15px] leading-6 text-[#191919]">
              {post || "The generated post will preview here."}
            </div>
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt=""
                className="max-h-80 w-full object-cover"
              />
            ) : null}
          </article>
        </aside>
      </div>
    </div>
  );
}

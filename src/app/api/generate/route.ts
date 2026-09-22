import { NextResponse } from "next/server";
import { generateLinkedInPost } from "@/lib/anthropic";
import { isAnthropicConfigured } from "@/lib/env";

export const maxDuration = 60;

const TONES = new Set([
  "professional",
  "conversational",
  "thought-leadership",
  "story",
]);

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export async function POST(request: Request) {
  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      {
        error:
          "Add ANTHROPIC_API_KEY to .env.local, then restart the dev server.",
      },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const topic = String(form.get("topic") ?? "").trim();
  const toneRaw = String(form.get("tone") ?? "professional").trim();
  const tone = TONES.has(toneRaw) ? toneRaw : "professional";
  const file = form.get("image");

  if (topic.length < 8) {
    return NextResponse.json(
      { error: "Tell Claude a bit more about what the post should cover." },
      { status: 400 },
    );
  }

  let image: { mediaType: string; data: string } | undefined;
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Use a JPEG, PNG, GIF, or WebP photo." },
        { status: 400 },
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Keep the photo under 5 MB when generating with Claude." },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    image = { mediaType: file.type, data: bytes.toString("base64") };
  }

  try {
    const post = await generateLinkedInPost({ topic, tone, image });
    return NextResponse.json({ post });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not generate a post.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

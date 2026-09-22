import { NextResponse } from "next/server";
import { FacebookApiError, publishFacebookPost } from "@/lib/facebook";
import { readFacebookSession } from "@/lib/session";

export const maxDuration = 60;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/tiff",
]);

export async function POST(request: Request) {
  const session = await readFacebookSession();
  if (!session) {
    return NextResponse.json(
      { error: "Connect Facebook before posting." },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const message = String(form.get("message") ?? "").trim();
  const pageId = String(form.get("pageId") ?? "").trim();
  const file = form.get("image");

  if (!pageId) {
    return NextResponse.json(
      { error: "Choose a Facebook Page to post as." },
      { status: 400 },
    );
  }
  if (!message) {
    return NextResponse.json(
      { error: "Write or generate a post first." },
      { status: 400 },
    );
  }
  if (message.length > 63206) {
    return NextResponse.json(
      { error: "This post is too long for Facebook." },
      { status: 400 },
    );
  }

  let image: { bytes: ArrayBuffer; type: string; name: string } | undefined;
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Facebook accepts JPEG, PNG, GIF, BMP, or TIFF photos." },
        { status: 400 },
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Keep the photo under 10 MB." },
        { status: 400 },
      );
    }
    image = {
      bytes: await file.arrayBuffer(),
      type: file.type,
      name: file.name,
    };
  }

  try {
    const result = await publishFacebookPost({
      accessToken: session.accessToken,
      pageId,
      message,
      image,
    });
    return NextResponse.json(result);
  } catch (error) {
    const messageText =
      error instanceof FacebookApiError
        ? error.message
        : "Could not publish the Facebook post.";
    const status = error instanceof FacebookApiError ? error.status : 500;
    return NextResponse.json({ error: messageText }, { status });
  }
}

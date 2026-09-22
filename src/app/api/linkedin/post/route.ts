import { NextResponse } from "next/server";
import { LinkedInApiError, publishLinkedInPost } from "@/lib/linkedin";
import { readSession } from "@/lib/session";

export const maxDuration = 60;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json(
      { error: "Connect LinkedIn before posting." },
      { status: 401 },
    );
  }

  const form = await request.formData();
  const commentary = String(form.get("commentary") ?? "").trim();
  const file = form.get("image");

  if (!commentary) {
    return NextResponse.json(
      { error: "Write or generate a post first." },
      { status: 400 },
    );
  }
  if (commentary.length > 3000) {
    return NextResponse.json(
      { error: "LinkedIn posts can be at most 3000 characters." },
      { status: 400 },
    );
  }

  let image: { bytes: ArrayBuffer; title?: string } | undefined;
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "LinkedIn accepts JPEG, PNG, or GIF photos." },
        { status: 400 },
      );
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Keep the photo under 8 MB." },
        { status: 400 },
      );
    }
    image = { bytes: await file.arrayBuffer(), title: file.name };
  }

  try {
    const result = await publishLinkedInPost({
      accessToken: session.accessToken,
      personUrn: session.personUrn,
      commentary,
      image,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof LinkedInApiError
        ? error.message
        : "Could not publish the post.";
    const status = error instanceof LinkedInApiError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

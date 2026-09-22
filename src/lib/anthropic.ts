import Anthropic from "@anthropic-ai/sdk";
import { anthropicConfig } from "@/lib/env";

const SYSTEM_PROMPT = `You write LinkedIn posts for a real person to publish.

Output only the post text. No title, no quotes around the whole post, no preamble.

Rules:
- First person, specific, and useful. Sound like a human, not a brand account.
- Short paragraphs with line breaks so it scans on a phone.
- 700–1300 characters unless the user asks otherwise.
- LinkedIn's limit is 3000 characters. Never exceed it.
- At most 3 hashtags, only at the end, only if they help discovery.
- Do not use emoji unless the user asks for them.
- Avoid cliches: "I'm excited to share", "I'm thrilled", "In today's fast-paced world", "Let's dive in", "game-changer".
- If a photo is attached, write a post that belongs with that image. Do not describe the photo as if the reader cannot see it.`;

export type GenerateInput = {
  topic: string;
  tone: string;
  image?: { mediaType: string; data: string };
};

export async function generateLinkedInPost(input: GenerateInput) {
  const { apiKey, model } = anthropicConfig();
  const client = new Anthropic({ apiKey });

  const textBlock = {
    type: "text" as const,
    text: `Tone: ${input.tone}

Write a LinkedIn post about:
${input.topic}`,
  };

  const content = input.image
    ? [
        {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: input.image.mediaType as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp",
            data: input.image.data,
          },
        },
        textBlock,
      ]
    : [textBlock];

  const message = await client.messages.create({
    model,
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const post = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!post) {
    throw new Error("Claude returned an empty post.");
  }

  return post.slice(0, 3000);
}

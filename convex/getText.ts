"use node";

import { createOpenAI } from "@ai-sdk/openai";
import { generateText, experimental_transcribe as transcribe } from "ai";
import { assert } from "convex-helpers";
import { Id } from "./_generated/dataModel";
import type { StorageActionWriter } from "convex/server";
import mammoth from "mammoth";

let cachedClient: ReturnType<typeof createOpenAI> | null = null;
let cachedApiKey: string | null = null;

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Set it with `npx convex env set dev OPENAI_API_KEY=...`."
    );
  }
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedApiKey = apiKey;
    cachedClient = createOpenAI({ apiKey });
  }
  return cachedClient!;
}

type GetTextArgs = {
  storageId: Id<"_storage">;
  filename: string;
  bytes?: ArrayBuffer;
  mimeType: string;
};

export async function getText(
  ctx: { storage: StorageActionWriter },
  { storageId, filename, bytes, mimeType }: GetTextArgs
) {
  const openai = getOpenAI();
  const describeImage = openai.chat("o4-mini");
  const describeAudio = openai.transcription("whisper-1");
  const describePdf = openai.chat("gpt-4.1");
  const describeHtml = openai.chat("gpt-4.1");

  const url = await ctx.storage.getUrl(storageId);
  assert(url, "Storage URL missing");

  const normalizedMime = mimeType.toLowerCase();
  if (
    ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
      normalizedMime
    )
  ) {
    const imageResult = await generateText({
      model: describeImage,
      system:
        "You convert images into detailed text transcripts. If the image contains a document, transcribe it accurately.",
      messages: [
        {
          role: "user",
          content: [{ type: "image", image: new URL(url) }],
        },
      ],
    });
    return imageResult.text;
  }

  if (normalizedMime.startsWith("audio/")) {
    const audioResult = await transcribe({
      model: describeAudio,
      audio: new URL(url),
    });
    return audioResult.text;
  }

  if (normalizedMime.includes("pdf")) {
    const pdfResult = await generateText({
      model: describePdf,
      system: "You transform PDF files into searchable text.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file",
              data: new URL(url),
              mediaType: mimeType,
              filename,
            },
            {
              type: "text",
              text: "Extract the text from the PDF and output only the clean text.",
            },
          ],
        },
      ],
    });
    return pdfResult.text;
  }

  if (
    normalizedMime.includes("word") ||
    normalizedMime.includes("officedocument")
  ) {
    const arrayBuffer =
      bytes || (await (await ctx.storage.get(storageId))!.arrayBuffer());
    const doc = await mammoth.extractRawText({ arrayBuffer });
    return doc.value;
  }

  if (normalizedMime.includes("text") || normalizedMime.includes("html")) {
    const arrayBuffer =
      bytes || (await (await ctx.storage.get(storageId))!.arrayBuffer());
    const text = new TextDecoder().decode(arrayBuffer);
    if (normalizedMime !== "text/plain") {
      const result = await generateText({
        model: describeHtml,
        system: "You transform content into markdown.",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text },
              {
                type: "text",
                text: "Extract the text and output it cleanly in markdown.",
              },
            ],
          },
        ],
      });
      return result.text;
    }
    return text;
  }

  throw new Error(`Unsupported mime type for extraction: ${mimeType}`);
}

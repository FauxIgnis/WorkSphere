"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Buffer } from "node:buffer";

const MAX_EXTRACTED_CHARS = 20000;
const SUPPORTED_WORD_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

async function extractTextFromArrayBuffer(
  fileBuffer: ArrayBuffer,
  fileType: string,
  fileName: string
) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const normalizedType = fileType.toLowerCase();

  try {
    if (normalizedType.includes("pdf") || extension === "pdf") {
      const pdfParseModule: any = await import("pdf-parse");
      const pdfParse = pdfParseModule.default ?? pdfParseModule;
      const result = await pdfParse(Buffer.from(fileBuffer));
      return result.text?.trim() || null;
    }

    if (
      SUPPORTED_WORD_TYPES.includes(normalizedType) ||
      extension === "docx" ||
      extension === "doc"
    ) {
      const mammothModule: any = await import("mammoth");
      const mammoth = mammothModule.default ?? mammothModule;
      const result = await mammoth.extractRawText({
        arrayBuffer: fileBuffer,
      });
      return result.value?.trim() || null;
    }
  } catch (error) {
    console.error(
      `Failed to extract text from file ${fileName} (${fileType})`,
      error
    );
    return null;
  }

  return null;
}

export const ensureExtractedText = internalAction({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const internalApi = internal as any;
    const file = await ctx.runQuery(internalApi.files.getFileRecordForInternal, {
      fileId: args.fileId,
    });

    if (!file) {
      return null;
    }

    if (file.extractedText && file.extractedText.trim().length > 0) {
      return file.extractedText;
    }

    const fileData = await ctx.storage.get(file.storageId);
    if (!fileData) {
      console.warn("Unable to read storage for file", file._id);
      return null;
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const extracted = await extractTextFromArrayBuffer(
      arrayBuffer,
      file.type,
      file.name
    );
    const normalized = extracted ? extracted.slice(0, MAX_EXTRACTED_CHARS) : null;

    await ctx.runMutation(internalApi.files.setExtractedText, {
      fileId: file._id,
      extractedText: normalized ?? undefined,
    });

    return normalized;
  },
});

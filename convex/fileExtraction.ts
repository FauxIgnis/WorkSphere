"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Buffer } from "node:buffer";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getText } from "./getText";

const MAX_EXTRACTED_CHARS = 20000;
const SUPPORTED_WORD_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

function ensurePdfDomPolyfills() {
  const g: any = globalThis as any;
  if (!g.DOMMatrix) {
    g.DOMMatrix = class {
      multiplySelf() {
        return this;
      }
      translateSelf() {
        return this;
      }
      scaleSelf() {
        return this;
      }
      rotateSelf() {
        return this;
      }
    };
  }

  if (!g.DOMPoint) {
    g.DOMPoint = class {};
  }

  if (!g.Path2D) {
    g.Path2D = class {};
  }

  if (!g.ImageData) {
    g.ImageData = class {};
  }

  if (!g.HTMLCanvasElement) {
    g.HTMLCanvasElement = class {};
  }

  if (!g.CanvasRenderingContext2D) {
    g.CanvasRenderingContext2D = class {
      constructor() {
        return new Proxy(
          {},
          {
            get: () => () => undefined,
          }
        );
      }
    };
  }

  if (!g.document) {
    g.document = {
      createElement: () => ({
        getContext: () => null,
      }),
    };
  }

  if (!g.navigator) {
    g.navigator = { userAgent: "node" };
  }

  if (!g.window) {
    g.window = g;
  }

  g.self = g;
}

async function extractTextFromArrayBuffer(
  fileBuffer: ArrayBuffer,
  fileType: string,
  fileName: string
) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  const normalizedType = fileType.toLowerCase();

  try {
    if (normalizedType.includes("pdf") || extension === "pdf") {
      ensurePdfDomPolyfills();
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

export const convertUploadToDocument = action({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    caseId: v.optional(v.id("cases")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const internalApi = internal as any;

    const extractedText = await getText(ctx, {
      storageId: args.storageId,
      filename: args.name,
      mimeType: args.type,
    });

    if (!extractedText || !extractedText.trim()) {
      return {
        status: "error",
        message:
          "Unable to extract readable content from this file. Please try a different format.",
      };
    }

    const limitedText = extractedText.slice(0, MAX_EXTRACTED_CHARS);
    const structuredBlocks = buildStructuredBlocksFromText(limitedText);
    const title = deriveTitleFromName(args.name);
    const documentId = await ctx.runMutation(
      internalApi.documents.createImportedDocument,
      {
        title,
        content: limitedText,
        structuredBlocks,
        userId,
        sourceName: args.name,
      }
    );

    if (args.caseId) {
      await ctx.runMutation(internalApi.cases.addDocumentToCase, {
        caseId: args.caseId,
        documentId,
      });
    }

    const fileId = await ctx.runMutation(internalApi.files.createFileRecord, {
      uploadedBy: userId,
      name: args.name,
      type: args.type,
      size: args.size,
      storageId: args.storageId,
      documentId,
      caseId: args.caseId,
    });

    await ctx.runMutation(internalApi.documents.linkDocumentToFile, {
      documentId,
      fileId,
    });

    return { status: "ok", documentId, fileId };
  },
});
async function getAuthenticatedUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

function deriveTitleFromName(name: string) {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");
  return withoutExtension.trim() || "Imported Document";
}

function buildStructuredBlocksFromText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const blocks: { type: string; text: string }[] = [];

  for (const line of lines) {
    if (!line) continue;
    const isHeading = line.length < 80 && /^[A-Z0-9\s,.-]+$/.test(line);
    blocks.push({
      type: isHeading ? "heading" : "paragraph",
      text: line,
    });
  }

  if (blocks.length === 0) {
    blocks.push({ type: "paragraph", text: text });
  }

  return blocks;
}

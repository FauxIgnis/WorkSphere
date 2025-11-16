import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function getAuthenticatedUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await getAuthenticatedUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    documentId: v.optional(v.id("documents")),
    caseId: v.optional(v.id("cases")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    if (args.caseId) {
      const caseDoc = await ctx.db.get(args.caseId);
      if (!caseDoc || caseDoc.createdBy !== userId) {
        throw new Error("Case not found or access denied");
      }
    }

    const fileId = await ctx.db.insert("files", {
      name: args.name,
      type: args.type,
      size: args.size,
      storageId: args.storageId,
      uploadedBy: userId,
      documentId: args.documentId,
      caseId: args.caseId,
      uploadedAt: Date.now(),
    });

    return fileId;
  },
});

export const getFile = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return null;
    }

    const url = await ctx.storage.getUrl(file.storageId);
    
    return {
      ...file,
      url,
    };
  },
});

export const getDocumentFiles = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        const uploader = await ctx.db.get(file.uploadedBy);
        return {
          ...file,
          url,
          uploader: uploader ? { name: uploader.name, email: uploader.email } : null,
        };
      })
    );

    return filesWithUrls;
  },
});

export const getCaseFiles = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId) {
      return [];
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_case", (q) => q.eq("caseId", args.caseId))
      .order("desc")
      .collect();

    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        const uploader = await ctx.db.get(file.uploadedBy);
        return {
          ...file,
          url,
          uploader: uploader ? { name: uploader.name, email: uploader.email } : null,
        };
      })
    );

    return filesWithUrls;
  },
});

export const deleteFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Only uploader can delete
    if (file.uploadedBy !== userId) {
      throw new Error("You can only delete files you uploaded");
    }

    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(args.fileId);
    
    return true;
  },
});

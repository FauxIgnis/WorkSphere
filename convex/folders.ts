import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

async function ensureFolderOwnership(ctx: any, folderId: string, userId: string) {
  const folder = await ctx.db.get(folderId);
  if (!folder) {
    throw new Error("Folder not found");
  }
  if (folder.createdBy !== userId) {
    throw new Error("You do not have permission to modify this folder");
  }
  return folder;
}

export const listUserFolders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_creator", (q: any) => q.eq("createdBy", userId))
      .order("desc")
      .collect();

    return Promise.all(
      folders.map(async (folder: any) => {
        const documents = await ctx.db
          .query("documents")
          .withIndex("by_folder", (q: any) => q.eq("folderId", folder._id))
          .collect();

        return {
          ...folder,
          documentCount: documents.length,
        };
      })
    );
  },
});

export const createFolder = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const now = Date.now();

    return await ctx.db.insert("folders", {
      name: args.name.trim(),
      description: args.description?.trim() || undefined,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateFolder = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await ensureFolderOwnership(ctx, args.folderId, userId);

    await ctx.db.patch(args.folderId, {
      name: args.name.trim(),
      description: args.description?.trim() || undefined,
      updatedAt: Date.now(),
    });

    return args.folderId;
  },
});

export const deleteFolder = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    await ensureFolderOwnership(ctx, args.folderId, userId);

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_folder", (q: any) => q.eq("folderId", args.folderId))
      .collect();

    for (const doc of documents) {
      await ctx.db.patch(doc._id, { folderId: undefined });
    }

    await ctx.db.delete(args.folderId);
    return true;
  },
});

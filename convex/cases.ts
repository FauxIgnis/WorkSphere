import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { action } from "convex/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/** -------------- AUTH HELPERS -------------- */

async function getAuthenticatedUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

/** -------------- CASE CRUD -------------- */

export const createCase = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const caseId = await ctx.db.insert("cases", {
      name: args.name,
      description: args.description,
      createdBy: userId,
      createdAt: Date.now(),
      lastModifiedAt: Date.now(),
      isActive: true,
      totalSize: 0,
      documentCount: 0,
    });

    await ctx.db.insert("auditLogs", {
      caseId,
      userId,
      action: "create_case",
      details: `Created case: ${args.name}`,
      timestamp: Date.now(),
    });

    return caseId;
  },
});

export const getUserCases = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("cases")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();
  },
});

export const getCase = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId) return null;

    return caseDoc;
  },
});

/** -------------- CHAT MESSAGES -------------- */

export const getCaseMessages = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId) return [];

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_case", (q) => q.eq("caseId", args.caseId))
      .order("asc")
      .collect();
  },
});

/** -------------- DOCUMENTS -------------- */

export const getCaseDocuments = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId) return [];

    return await ctx.db
      .query("documents")
      .withIndex("by_case", (q) => q.eq("caseId", args.caseId))
      .order("desc")
      .collect();
  },
});

export const addDocumentToCase = mutation({
  args: { caseId: v.id("cases"), documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId)
      throw new Error("Case not found or access denied");

    const document = await ctx.db.get(args.documentId);
    if (!document) throw new Error("Document not found");

    const documentSize = new TextEncoder().encode(document.content).length;

    if (caseDoc.documentCount >= 30)
      throw new Error("Case document limit reached");

    if (caseDoc.totalSize + documentSize > 50 * 1024 * 1024)
      throw new Error("Case size limit reached");

    await ctx.db.patch(args.documentId, { caseId: args.caseId });

    await ctx.db.patch(args.caseId, {
      documentCount: caseDoc.documentCount + 1,
      totalSize: caseDoc.totalSize + documentSize,
      lastModifiedAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      caseId: args.caseId,
      documentId: args.documentId,
      userId,
      action: "add_document_to_case",
      details: `Added document: ${document.title}`,
      timestamp: Date.now(),
    });

    return true;
  },
});

export const removeDocumentFromCase = mutation({
  args: { caseId: v.id("cases"), documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId)
      throw new Error("Case not found or access denied");

    const document = await ctx.db.get(args.documentId);
    if (!document || document.caseId !== args.caseId)
      throw new Error("Document not found in this case");

    const size = new TextEncoder().encode(document.content).length;

    await ctx.db.patch(args.documentId, { caseId: undefined });

    await ctx.db.patch(args.caseId, {
      documentCount: Math.max(0, caseDoc.documentCount - 1),
      totalSize: Math.max(0, caseDoc.totalSize - size),
      lastModifiedAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      caseId: args.caseId,
      documentId: args.documentId,
      userId,
      action: "remove_document_from_case",
      details: `Removed document: ${document.title}`,
      timestamp: Date.now(),
    });

    return true;
  },
});

/** -------------- UPDATE / DELETE -------------- */

export const updateCase = mutation({
  args: {
    caseId: v.id("cases"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId)
      throw new Error("Case not found or access denied");

    const updates: any = { lastModifiedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.caseId, updates);
    return true;
  },
});

export const deleteCase = mutation({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId)
      throw new Error("Case not found or access denied");

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_case", (q) => q.eq("caseId", args.caseId))
      .collect();

    for (const doc of documents) {
      await ctx.db.patch(doc._id, { caseId: undefined });
    }

    await ctx.db.patch(args.caseId, {
      isActive: false,
      lastModifiedAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      caseId: args.caseId,
      userId,
      action: "delete_case",
      details: `Deleted case: ${caseDoc.name}`,
      timestamp: Date.now(),
    });

    return true;
  },
});

/** -------------- AI MESSAGE (ACTION) -------------- */

export const sendMessageToCaseAI = action({
  args: {
    caseId: v.id("cases"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.runQuery(internal.auth.getUserId, {});
    if (!userId) throw new Error("Not authenticated");

    const caseDoc = await ctx.runQuery(internal.cases.getCase, {
      caseId: args.caseId,
    });

    if (!caseDoc || caseDoc.createdBy !== userId)
      throw new Error("Case not found or access denied");

    const timestamp = Date.now();

    const userMsgId = await ctx.runMutation(
      internal.chatMessages.insertUserMessage,
      {
        content: args.content,
        caseId: args.caseId,
        authorId: userId,
        timestamp,
      }
    );

    const aiResponse = await ctx.actions.internal.cases.generateAIReply({
      caseId: args.caseId,
      userMessage: args.content,
    });

    const aiMsgId = await ctx.runMutation(
      internal.chatMessages.insertAIMessage,
      {
        content: aiResponse,
        caseId: args.caseId,
        authorId: userId,
        timestamp: Date.now(),
      }
    );

    return { userMsgId, aiMsgId, aiResponse };
  },
});

/** -------------- AI ACTION -------------- */

export const generateAIReply = action({
  args: {
    caseId: v.id("cases"),
    userMessage: v.string(),
  },
  handler: async (_, args) => {
    return `AI received: "${args.userMessage}"`;
  },
});

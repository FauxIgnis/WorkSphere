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

    // Log audit event
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
    if (!userId) {
      return [];
    }

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
    if (!userId) {
      return null;
    }

    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId) {
      return null;
    }

    return caseDoc;
  },
});

    // Returns chat messages for a specific case
    export const getCaseMessages = query({
      args: { caseId: v.id("cases") },
      handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const caseDoc = await ctx.db.get(args.caseId);
        if (!caseDoc || caseDoc.createdBy !== userId) {
          return [];
        }

        return await ctx.db
          .query("chatMessages")
          .withIndex("by_case", q => q.eq("caseId", args.caseId))
          .order("asc")
          .collect();
      },
    });

export const getCaseDocuments = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify user has access to this case
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId) {
      return [];
    }

    return await ctx.db
      .query("documents")
      .withIndex("by_case", (q) => q.eq("caseId", args.caseId))
      .order("desc")
      .collect();
  },
});

export const addDocumentToCase = mutation({
  args: {
    caseId: v.id("cases"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    // Verify user owns the case
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId) {
      throw new Error("Case not found or access denied");
    }

    // Check case limits (30 documents, 50MB)
    if (caseDoc.documentCount >= 30) {
      throw new Error("Case document limit reached (30 documents maximum)");
    }

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Estimate document size (rough calculation)
    const documentSize = new TextEncoder().encode(document.content).length;
    if (caseDoc.totalSize + documentSize > 50 * 1024 * 1024) { // 50MB
      throw new Error("Case size limit reached (50MB maximum)");
    }

    // Add document to case
    await ctx.db.patch(args.documentId, {
      caseId: args.caseId,
    });

    // Update case statistics
    await ctx.db.patch(args.caseId, {
      documentCount: caseDoc.documentCount + 1,
      totalSize: caseDoc.totalSize + documentSize,
      lastModifiedAt: Date.now(),
    });

    // Log audit event
    await ctx.db.insert("auditLogs", {
      caseId: args.caseId,
      documentId: args.documentId,
      userId,
      action: "add_document_to_case",
      details: `Added document "${document.title}" to case`,
      timestamp: Date.now(),
    });

    return true;
  },
});

export const removeDocumentFromCase = mutation({
  args: {
    caseId: v.id("cases"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    // Verify user owns the case
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId) {
      throw new Error("Case not found or access denied");
    }

    const document = await ctx.db.get(args.documentId);
    if (!document || document.caseId !== args.caseId) {
      throw new Error("Document not found in this case");
    }

    // Remove document from case
    await ctx.db.patch(args.documentId, {
      caseId: undefined,
    });

    // Update case statistics
    const documentSize = new TextEncoder().encode(document.content).length;
    await ctx.db.patch(args.caseId, {
      documentCount: Math.max(0, caseDoc.documentCount - 1),
      totalSize: Math.max(0, caseDoc.totalSize - documentSize),
      lastModifiedAt: Date.now(),
    });

    // Log audit event
    await ctx.db.insert("auditLogs", {
      caseId: args.caseId,
      documentId: args.documentId,
      userId,
      action: "remove_document_from_case",
      details: `Removed document "${document.title}" from case`,
      timestamp: Date.now(),
    });

    return true;
  },
});

export const updateCase = mutation({
  args: {
    caseId: v.id("cases"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId) {
      throw new Error("Case not found or access denied");
    }

    const updates: any = {
      lastModifiedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.caseId, updates);

    return true;
  },
});

export const deleteCase = mutation({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId) {
      throw new Error("Case not found or access denied");
    }

    // Remove case reference from all documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_case", (q) => q.eq("caseId", args.caseId))
      .collect();

    for (const doc of documents) {
      await ctx.db.patch(doc._id, {
        caseId: undefined,
      });
    }

    // Mark case as inactive instead of deleting
    await ctx.db.patch(args.caseId, {
      isActive: false,
      lastModifiedAt: Date.now(),
    });

    // Log audit event
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

import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Mutation: user sends a message to the AI inside a case
export const sendMessageToCaseAI = mutation({
  args: {
    caseId: v.id("cases"),
    content: v.string(),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc || caseDoc.createdBy !== userId) {
      throw new Error("Case not found or access denied");
    }

    const timestamp = Date.now();

    // 1. Save user message
    const userMsgId = await ctx.db.insert("chatMessages", {
      content: args.content,
      authorId: userId,
      caseId: args.caseId,
      isAI: false,
      timestamp,
    });

   // 2. Call AI (Convex action)
const aiResponse = await ctx.actions.internal.cases.generateAIReply({
  caseId: args.caseId,
  userMessage: args.content,
});



    // 3. Save AI message
    const aiMsgId = await ctx.db.insert("chatMessages", {
      content: aiResponse,
      authorId: userId,
      caseId: args.caseId,
      isAI: true,
      timestamp: Date.now(),
    });

    return { userMsgId, aiMsgId, aiResponse };
  },
});

// Action
export const generateAIReply = action({
  args: {
    caseId: v.id("cases"),
    userMessage: v.string(),
  },
  handler: async (_, args) => {
    return `AI received: "${args.userMessage}"`;
  },
});

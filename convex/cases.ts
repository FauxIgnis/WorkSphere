import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
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
    const userId = await getAuthenticatedUser(ctx);
    const internalApi = internal as any;

    const caseDoc = await ctx.runQuery(internalApi.cases.getCase, {
      caseId: args.caseId,
    });

    if (!caseDoc || caseDoc.createdBy !== userId)
      throw new Error("Case not found or access denied");

    const timestamp = Date.now();

    const userMsgId = await ctx.runMutation(
      internalApi.chat.insertCaseUserMessage,
      {
        content: args.content,
        caseId: args.caseId,
        authorId: userId,
        timestamp,
      }
    );

    const aiResponse = await ctx.runAction(
      internalApi.cases.generateAIReply,
      {
        caseId: args.caseId,
        userMessage: args.content,
      }
    );

    const aiMsgId = await ctx.runMutation(
      internalApi.chat.insertCaseAIMessage,
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
  handler: async (ctx, args) => {
    const internalApi = internal as any;

    const [caseDoc, caseDocuments] = await Promise.all([
      ctx.runQuery(internalApi.cases.getCase, { caseId: args.caseId }),
      ctx.runQuery(internalApi.cases.getCaseDocuments, { caseId: args.caseId }),
    ]);

    if (!caseDoc)
      throw new Error("Case not found or access denied");

    const documents = (caseDocuments || [])
      .filter((doc: any) => typeof doc.content === "string" && doc.content.trim().length)
      .sort((a: any, b: any) => (b.lastModifiedAt ?? 0) - (a.lastModifiedAt ?? 0));

    if (documents.length === 0) {
      return "I can help once there are documents with readable text in this case. Please add or update case documents and ask again.";
    }

    const MAX_CONTEXT_CHARS = 12000;
    const PER_DOCUMENT_LIMIT = 2000;
    const contextSections: string[] = [];
    let currentLength = 0;

    for (const doc of documents) {
      const snippet = doc.content.slice(0, PER_DOCUMENT_LIMIT).trim();
      if (!snippet) continue;

      const section = `Title: ${doc.title}\nContent:\n${snippet}`;
      if (currentLength + section.length > MAX_CONTEXT_CHARS && contextSections.length > 0) {
        break;
      }

      contextSections.push(section);
      currentLength += section.length;

      if (currentLength >= MAX_CONTEXT_CHARS) {
        break;
      }
    }

    if (contextSections.length === 0) {
      return "I wasn't able to find usable text in the attached case documents. Please provide more detailed content and try again.";
    }

    const contextBlock = contextSections
      .map((section, index) => `Document ${index + 1}:\n${section}`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are Case AI, a legal analyst who strictly relies on the provided case documents.\n- Always ground your answers in the supplied context.\n- Reference the relevant document titles in parentheses when you cite supporting material.\n- If the documents don't contain the answer, explain what is missing instead of guessing.`;

    const userPrompt = `Case: ${caseDoc.name}${caseDoc.description ? `\nDescription: ${caseDoc.description}` : ""}\n\nContext from case documents:\n${contextBlock}\n\nUser question:\n${args.userMessage}\n\nWrite a concise, well-structured answer in the user's language.`;

    const apiKey = process.env.CONVEX_OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("CONVEX_OPENAI_API_KEY is not configured for Case AI");
      return "I received your question but the AI service is not configured. Please add an OpenAI API key and try again.";
    }

    try {
      const openai = await import("openai");
      const client = new openai.default({
        baseURL: process.env.CONVEX_OPENAI_BASE_URL,
        apiKey,
      });

      const completion = await client.chat.completions.create({
        model: "gpt-4.1-nano",
        temperature: 0.3,
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const aiResponse = completion.choices[0]?.message?.content?.trim();
      return (
        aiResponse ||
        "I couldn't generate a response right now. Please try again in a few moments."
      );
    } catch (error) {
      console.error("Case AI generation failed", error);
      return "I wasn't able to reach the AI service. Please try again later.";
    }
  },
});

import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

async function getAuthenticatedUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

export const sendMessage = mutation({
  args: {
    content: v.string(),
    documentId: v.optional(v.id("documents")),
    mentions: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    const messageId = await ctx.db.insert("chatMessages", {
      content: args.content,
      authorId: userId,
      documentId: args.documentId,
      isAI: false,
      timestamp: Date.now(),
      mentions: args.mentions,
    });

    return messageId;
  },
});

export const getChatMessages = query({
  args: { 
    documentId: v.optional(v.id("documents")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const messages = args.documentId
      ? await ctx.db
          .query("chatMessages")
          .withIndex("by_document", (q) => q.eq("documentId", args.documentId!))
          .order("desc")
          .take(args.limit || 50)
      : await ctx.db
          .query("chatMessages")
          .withIndex("by_timestamp")
          .filter((q) => q.eq(q.field("caseId"), undefined))
          .order("desc")
          .take(args.limit || 50);

    // Get author information for each message
    const messagesWithAuthors = await Promise.all(
      messages.map(async (message) => {
        const author = await ctx.db.get(message.authorId);
        return {
          ...message,
          author: author ? { name: author.name, email: author.email } : null,
        };
      })
    );

    return messagesWithAuthors.reverse();
  },
});

export const generateAIResponse = action({
  args: {
    userMessage: v.string(),
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    try {
      const openai = await import("openai");
      const client = new openai.default({
        baseURL: process.env.CONVEX_OPENAI_BASE_URL,
        apiKey: process.env.CONVEX_OPENAI_API_KEY,
      });

      const completion = await client.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content: `You are a legal AI assistant specialized in helping lawyers and legal professionals. 
            Provide accurate, helpful legal information while always reminding users to consult with 
            qualified legal counsel for specific legal advice. Be professional, concise, and cite 
            relevant legal principles when appropriate. Format your responses clearly with bullet points 
            or numbered lists when helpful.`
          },
          {
            role: "user",
            content: args.userMessage
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content;
      
      if (aiResponse) {
        return aiResponse;
      } else {
        throw new Error("No response from AI");
      }
    } catch (error) {
      console.error("AI response generation failed:", error);
      throw new Error("Failed to generate AI response");
    }
  },
});

export const addReaction = mutation({
  args: {
    messageId: v.id("chatMessages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    const reactions = message.reactions || [];
    const existingReaction = reactions.find(r => r.userId === userId && r.emoji === args.emoji);
    
    if (existingReaction) {
      // Remove reaction if it already exists
      const updatedReactions = reactions.filter(r => !(r.userId === userId && r.emoji === args.emoji));
      await ctx.db.patch(args.messageId, { reactions: updatedReactions });
    } else {
      // Add new reaction
      const updatedReactions = [...reactions, { emoji: args.emoji, userId }];
      await ctx.db.patch(args.messageId, { reactions: updatedReactions });
    }

    return true;
  },
});

export const insertCaseUserMessage = internalMutation({
  args: {
    content: v.string(),
    caseId: v.id("cases"),
    authorId: v.id("users"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("chatMessages", {
      content: args.content,
      authorId: args.authorId,
      caseId: args.caseId,
      isAI: false,
      timestamp: args.timestamp,
    });
  },
});

export const insertCaseAIMessage = internalMutation({
  args: {
    content: v.string(),
    caseId: v.id("cases"),
    authorId: v.id("users"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("chatMessages", {
      content: args.content,
      authorId: args.authorId,
      caseId: args.caseId,
      isAI: true,
      timestamp: args.timestamp,
    });
  },
});

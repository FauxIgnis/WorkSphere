import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

const STORED_PROMPT = {
  id: "pmpt_69106c352fc0819683da7827dd4edc2f076e6bd8c6cb1b3b",
  version: "8",
};

async function requireUserId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

export const listChats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const chats = await ctx.db
      .query("aiChats")
      .withIndex("by_user_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return chats;
  },
});

export const getChat = query({
  args: { chatId: v.id("aiChats") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      return null;
    }

    return chat;
  },
});

export const getMessages = query({
  args: {
    chatId: v.id("aiChats"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      return [];
    }

    const take = Math.min(args.limit ?? 100, 200);
    const messages = await ctx.db
      .query("aiChatMessages")
      .withIndex("by_chat_createdAt", (q) => q.eq("chatId", args.chatId))
      .order("desc")
      .take(take);

    return messages.reverse();
  },
});

export const createChat = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const safeTitle =
      args.title?.trim() ||
      `Chat ${new Date(now).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`;

    const chatId = await ctx.db.insert("aiChats", {
      userId,
      title: safeTitle,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: undefined,
      lastMessagePreview: undefined,
    });

    return chatId;
  },
});

export const renameChat = mutation({
  args: {
    chatId: v.id("aiChats"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    await ctx.db.patch(args.chatId, {
      title: args.title.trim().slice(0, 80),
    });

    return true;
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id("aiChats") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    const messages = await ctx.db
      .query("aiChatMessages")
      .withIndex("by_chat_createdAt", (q) => q.eq("chatId", args.chatId))
      .take(500);
    await Promise.all(messages.map((message) => ctx.db.delete(message._id)));
    await ctx.db.delete(args.chatId);
    return true;
  },
});

export const sendMessage = action({
  args: {
    chatId: v.id("aiChats"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const internalApi = internal as any;

    const chat = await ctx.runQuery(internalApi.aiChats.getChat, {
      chatId: args.chatId,
    });
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    const previousMessages =
      (await ctx.runQuery(internalApi.aiChats.getMessages, {
        chatId: args.chatId,
        limit: 12,
      })) || [];

    const timestamp = Date.now();
    await ctx.runMutation(internalApi.aiChats.appendMessage, {
      chatId: args.chatId,
      role: "user",
      content: args.content,
      createdAt: timestamp,
    });

    const apiKey =
      process.env.OPENAI_API_KEY || process.env.CONVEX_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.responses.create({
      prompt: STORED_PROMPT,
      input: [
        ...previousMessages.map((message: any) => {
          const isAssistant = message.role === "assistant";
          return {
            role: isAssistant ? "assistant" : "user",
            content: [
              {
                type: isAssistant ? "output_text" : "input_text",
                text: message.content,
              },
            ],
          };
        }),
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: args.content,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "text",
        },
      },
      reasoning: {},
      max_output_tokens: 3500,
      store: true,
      include: ["web_search_call.action.sources"],
    });

    const aiText =
      (response as any).output_text ||
      ((response as any).output || [])
        .map((chunk: any) =>
          chunk.content
            ?.map((piece: any) => piece?.text || piece?.content || "")
            .join(" ")
        )
        .join("\n");

    const reply = typeof aiText === "string" ? aiText.trim() : "";
    if (!reply) {
      throw new Error("AI did not return a response");
    }

    await ctx.runMutation(internalApi.aiChats.appendMessage, {
      chatId: args.chatId,
      role: "assistant",
      content: reply,
      createdAt: Date.now(),
    });

    return reply;
  },
});

export const appendMessage = internalMutation({
  args: {
    chatId: v.id("aiChats"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    const messageId = await ctx.db.insert("aiChatMessages", {
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      createdAt: args.createdAt,
    });

    await ctx.db.patch(args.chatId, {
      updatedAt: args.createdAt,
      lastMessageAt: args.createdAt,
      lastMessagePreview: args.content.slice(0, 200),
    });

    return messageId;
  },
});

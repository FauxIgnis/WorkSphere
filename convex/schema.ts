import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  documents: defineTable({
    title: v.string(),
    content: v.string(),
    isPublic: v.boolean(),
    createdBy: v.id("users"),
    lastModifiedBy: v.id("users"),
    lastModifiedAt: v.number(),
    version: v.number(),
    shareableLink: v.optional(v.string()),
    caseId: v.optional(v.id("cases")),
    folderId: v.optional(v.id("folders")),
    structuredBlocks: v.optional(
      v.array(
        v.object({
          type: v.string(),
          text: v.string(),
        })
      )
    ),
    sourceFileId: v.optional(v.id("files")),
  })
    .index("by_creator", ["createdBy"])
    .index("by_shareable_link", ["shareableLink"])
    .index("by_case", ["caseId"])
    .index("by_folder", ["folderId"])
    .searchIndex("search_title", {
      searchField: "title",
    })
    .searchIndex("search_content", {
      searchField: "content",
    }),

  folders: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_creator", ["createdBy"]),

  cases: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    lastModifiedAt: v.number(),
    isActive: v.boolean(),
    totalSize: v.number(), // in bytes
    documentCount: v.number(),
  })
    .index("by_creator", ["createdBy"])
    .index("by_active", ["isActive"]),

  documentVersions: defineTable({
    documentId: v.id("documents"),
    content: v.string(),
    version: v.number(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    changeDescription: v.optional(v.string()),
  })
    .index("by_document", ["documentId"])
    .index("by_document_version", ["documentId", "version"]),

  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"),
    createdAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_owner", ["ownerId"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("administrator"), 
      v.literal("contributor"),
      v.literal("external_guest")
    ),
    invitedBy: v.id("users"),
    joinedAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  workspaceInvitations: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(
      v.literal("administrator"), 
      v.literal("contributor"),
      v.literal("external_guest")
    ),
    invitedBy: v.id("users"),
    invitedAt: v.number(),
    expiresAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    token: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"]),

  documentPermissions: defineTable({
    documentId: v.id("documents"),
    userId: v.id("users"),
    role: v.union(v.literal("viewer"), v.literal("editor"), v.literal("admin")),
    grantedBy: v.id("users"),
    grantedAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_user", ["userId"])
    .index("by_document_user", ["documentId", "userId"]),

  comments: defineTable({
    documentId: v.id("documents"),
    authorId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
    parentCommentId: v.optional(v.id("comments")),
    isResolved: v.optional(v.boolean()),
    type: v.optional(v.union(v.literal("comment"), v.literal("suggestion"))),
    // For text selection
    selectionStart: v.optional(v.number()),
    selectionEnd: v.optional(v.number()),
    selectedText: v.optional(v.string()),
    // For suggestions
    proposedChange: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("pending"), 
      v.literal("accepted"), 
      v.literal("rejected")
    )),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_document", ["documentId"])
    .index("by_author", ["authorId"])
    .index("by_status", ["status"]),

  presence: defineTable({
    userId: v.id("users"),
    documentId: v.optional(v.id("documents")),
    workspaceId: v.optional(v.id("workspaces")),
    lastSeen: v.number(),
    isActive: v.boolean(),
    cursorPosition: v.optional(v.number()),
    selection: v.optional(v.object({
      start: v.number(),
      end: v.number(),
    })),
  })
    .index("by_document", ["documentId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("mention"),
      v.literal("assignment"),
      v.literal("comment"),
      v.literal("suggestion"),
      v.literal("deadline"),
      v.literal("invitation")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
    relatedDocumentId: v.optional(v.id("documents")),
    relatedCommentId: v.optional(v.id("comments")),
    relatedTaskId: v.optional(v.id("tasks")),
    actionUrl: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_read_status", ["userId", "isRead"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro")),
    status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("expired")),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  usageTracking: defineTable({
    userId: v.id("users"),
    month: v.string(), // YYYY-MM format
    aiQuestions: v.number(),
    tasksCreated: v.number(),
    documentsCreated: v.number(),
    pdfExports: v.number(),
    calendarEvents: v.number(),
    fileUploads: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_user_month", ["userId", "month"]),

  chatMessages: defineTable({
    content: v.string(),
    authorId: v.id("users"),
    documentId: v.optional(v.id("documents")),
    caseId: v.optional(v.id("cases")),
    isAI: v.boolean(),
    timestamp: v.number(),
    mentions: v.optional(v.array(v.id("users"))),
    reactions: v.optional(v.array(v.object({
      emoji: v.string(),
      userId: v.id("users"),
    }))),
  })
    .index("by_document", ["documentId"])
    .index("by_case", ["caseId"])
    .index("by_author", ["authorId"])
    .index("by_timestamp", ["timestamp"]),

  aiChats: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
  })
    .index("by_user_updatedAt", ["userId", "updatedAt"]),

  aiChatMessages: defineTable({
    chatId: v.id("aiChats"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_chat_createdAt", ["chatId", "createdAt"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("completed")),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    createdBy: v.id("users"),
    assignedTo: v.optional(v.id("users")),
    documentId: v.optional(v.id("documents")),
    caseId: v.optional(v.id("cases")),
    dueDate: v.optional(v.number()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    location: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_assignee", ["assignedTo"])
    .index("by_document", ["documentId"])
    .index("by_case", ["caseId"])
    .index("by_status", ["status"]),

  calendarEvents: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    createdBy: v.id("users"),
    attendees: v.optional(v.array(v.id("users"))),
    documentId: v.optional(v.id("documents")),
    caseId: v.optional(v.id("cases")),
    location: v.optional(v.string()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_start_time", ["startTime"])
    .index("by_document", ["documentId"])
    .index("by_case", ["caseId"]),

  auditLogs: defineTable({
    documentId: v.optional(v.id("documents")),
    caseId: v.optional(v.id("cases")),
    workspaceId: v.optional(v.id("workspaces")),
    userId: v.id("users"),
    action: v.string(),
    details: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_case", ["caseId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),

  files: defineTable({
    name: v.string(),
    type: v.string(),
    size: v.number(),
    storageId: v.id("_storage"),
    uploadedBy: v.id("users"),
    documentId: v.optional(v.id("documents")),
    caseId: v.optional(v.id("cases")),
    uploadedAt: v.number(),
    extractedText: v.optional(v.string()),
  })
    .index("by_uploader", ["uploadedBy"])
    .index("by_document", ["documentId"])
    .index("by_case", ["caseId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});

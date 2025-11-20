import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to get authenticated user
async function getAuthenticatedUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

// Helper function to check document permissions
async function checkDocumentPermission(
  ctx: any,
  documentId: string,
  userId: string,
  requiredRole: "viewer" | "editor" | "admin"
) {
  const document = await ctx.db.get(documentId);
  if (!document) {
    throw new Error("Document not found");
  }

  // Creator has all permissions
  if (document.createdBy === userId) {
    return true;
  }

  // Check if document is public for viewing
  if (document.isPublic && requiredRole === "viewer") {
    return true;
  }

  // Check explicit permissions
  const permission = await ctx.db
    .query("documentPermissions")
    .withIndex("by_document_user", (q: any) => 
      q.eq("documentId", documentId).eq("userId", userId)
    )
    .unique();

  if (!permission) {
    return false;
  }

  const roleHierarchy: Record<string, number> = { viewer: 1, editor: 2, admin: 3 };
  return roleHierarchy[permission.role] >= roleHierarchy[requiredRole];
}

async function ensureFolderOwnership(
  ctx: any,
  folderId: string,
  userId: string
) {
  const folder = await ctx.db.get(folderId);
  if (!folder) {
    throw new Error("Folder not found");
  }
  if (folder.createdBy !== userId) {
    throw new Error("You don't have access to this folder");
  }
  return folder;
}

export const createDocument = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    if (args.folderId) {
      await ensureFolderOwnership(ctx, args.folderId, userId);
    }
    
    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content || "",
      isPublic: args.isPublic || false,
      createdBy: userId,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
      version: 1,
      folderId: args.folderId,
    });

    // Create initial version
    await ctx.db.insert("documentVersions", {
      documentId,
      content: args.content || "",
      version: 1,
      createdBy: userId,
      createdAt: Date.now(),
      changeDescription: "Initial version",
    });

    // Log audit event
    await ctx.db.insert("auditLogs", {
      documentId,
      userId,
      action: "create",
      timestamp: Date.now(),
    });

    return documentId;
  },
});

export const updateDocument = mutation({
  args: {
    documentId: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    changeDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    const hasPermission = await checkDocumentPermission(
      ctx,
      args.documentId,
      userId,
      "editor"
    );
    
    if (!hasPermission) {
      throw new Error("Insufficient permissions");
    }

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    const updates: any = {
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    };

    if (args.title !== undefined) {
      updates.title = args.title;
    }

    if (args.content !== undefined) {
      updates.content = args.content;
      updates.version = document.version + 1;

      // Create new version
      await ctx.db.insert("documentVersions", {
        documentId: args.documentId,
        content: args.content,
        version: document.version + 1,
        createdBy: userId,
        createdAt: Date.now(),
        changeDescription: args.changeDescription || "Document updated",
      });
    }

    await ctx.db.patch(args.documentId, updates);

    // Log audit event
    await ctx.db.insert("auditLogs", {
      documentId: args.documentId,
      userId,
      action: "edit",
      details: args.changeDescription,
      timestamp: Date.now(),
    });

    return args.documentId;
  },
});

export const getDocument = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      return null;
    }

    // Check if user can view this document
    if (userId) {
      const hasPermission = await checkDocumentPermission(
        ctx,
        args.documentId,
        userId,
        "viewer"
      );
      
      if (!hasPermission) {
        return null;
      }
    } else if (!document.isPublic) {
      return null;
    }

    return document;
  },
});

export const getDocumentByShareableLink = query({
  args: { shareableLink: v.string() },
  handler: async (ctx, args) => {
    const document = await ctx.db
      .query("documents")
      .withIndex("by_shareable_link", (q) => 
        q.eq("shareableLink", args.shareableLink)
      )
      .unique();

    if (!document || !document.isPublic) {
      return null;
    }

    return document;
  },
});

export const listUserDocuments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get documents created by user
    const ownedDocs = await ctx.db
      .query("documents")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .collect();

    // Get documents with explicit permissions
    const permissions = await ctx.db
      .query("documentPermissions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const sharedDocs = await Promise.all(
      permissions.map(async (perm) => {
        const doc = await ctx.db.get(perm.documentId);
        return doc ? { ...doc, role: perm.role } : null;
      })
    );

    const validSharedDocs = sharedDocs.filter(Boolean);

    return [...ownedDocs, ...validSharedDocs];
  },
});

export const searchDocuments = query({
  args: {
    query: v.string(),
    searchType: v.optional(v.union(v.literal("title"), v.literal("content"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const searchIndex = args.searchType === "title" ? "search_title" : "search_content";
    
    const results = await ctx.db
      .query("documents")
      .withSearchIndex(searchIndex, (q) =>
        q.search(args.searchType === "title" ? "title" : "content", args.query)
      )
      .collect();

    // Filter results based on permissions
    const filteredResults = [];
    for (const doc of results) {
      const hasPermission = await checkDocumentPermission(
        ctx,
        doc._id,
        userId,
        "viewer"
      );
      if (hasPermission) {
        filteredResults.push(doc);
      }
    }

    return filteredResults;
  },
});

export const generateShareableLink = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    const hasPermission = await checkDocumentPermission(
      ctx,
      args.documentId,
      userId,
      "admin"
    );
    
    if (!hasPermission) {
      throw new Error("Insufficient permissions");
    }

    const shareableLink = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    await ctx.db.patch(args.documentId, {
      shareableLink,
      isPublic: true,
    });

    // Log audit event
    await ctx.db.insert("auditLogs", {
      documentId: args.documentId,
      userId,
      action: "share",
      details: `Generated shareable link: ${shareableLink}`,
      timestamp: Date.now(),
    });

    return shareableLink;
  },
});

export const createImportedDocument = internalMutation({
  args: {
    title: v.string(),
    content: v.string(),
    structuredBlocks: v.optional(
      v.array(
        v.object({
          type: v.string(),
          text: v.string(),
        })
      )
    ),
    userId: v.id("users"),
    sourceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const documentId = await ctx.db.insert("documents", {
      title: args.title,
      content: args.content,
      isPublic: false,
      createdBy: args.userId,
      lastModifiedBy: args.userId,
      lastModifiedAt: now,
      version: 1,
      structuredBlocks: args.structuredBlocks,
    });

    await ctx.db.insert("documentVersions", {
      documentId,
      content: args.content,
      version: 1,
      createdBy: args.userId,
      createdAt: now,
      changeDescription: args.sourceName
        ? `Imported from ${args.sourceName}`
        : "Imported document",
    });

    await ctx.db.insert("auditLogs", {
      documentId,
      userId: args.userId,
      action: "import_from_file",
      details: args.sourceName,
      timestamp: now,
    });

    return documentId;
  },
});

export const linkDocumentToFile = internalMutation({
  args: {
    documentId: v.id("documents"),
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, { sourceFileId: args.fileId });
  },
});

export const grantDocumentPermission = mutation({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"),
    role: v.union(v.literal("viewer"), v.literal("editor"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const granterId = await getAuthenticatedUser(ctx);
    
    const hasPermission = await checkDocumentPermission(
      ctx,
      args.documentId,
      granterId,
      "admin"
    );
    
    if (!hasPermission) {
      throw new Error("Insufficient permissions");
    }

    // Check if permission already exists
    const existingPermission = await ctx.db
      .query("documentPermissions")
      .withIndex("by_document_user", (q) => 
        q.eq("documentId", args.documentId).eq("userId", args.userId)
      )
      .unique();

    if (existingPermission) {
      await ctx.db.patch(existingPermission._id, {
        role: args.role,
        grantedBy: granterId,
        grantedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("documentPermissions", {
        documentId: args.documentId,
        userId: args.userId,
        role: args.role,
        grantedBy: granterId,
        grantedAt: Date.now(),
      });
    }

    return true;
  },
});

export const getDocumentVersions = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const hasPermission = await checkDocumentPermission(
      ctx,
      args.documentId,
      userId,
      "viewer"
    );
    
    if (!hasPermission) {
      return [];
    }

    return await ctx.db
      .query("documentVersions")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .order("desc")
      .collect();
  },
});

export const rollbackToVersion = mutation({
  args: {
    documentId: v.id("documents"),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    const hasPermission = await checkDocumentPermission(
      ctx,
      args.documentId,
      userId,
      "editor"
    );
    
    if (!hasPermission) {
      throw new Error("Insufficient permissions");
    }

    const targetVersion = await ctx.db
      .query("documentVersions")
      .withIndex("by_document_version", (q) => 
        q.eq("documentId", args.documentId).eq("version", args.version)
      )
      .unique();

    if (!targetVersion) {
      throw new Error("Version not found");
    }

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    const newVersion = document.version + 1;

    // Update document with rolled back content
    await ctx.db.patch(args.documentId, {
      content: targetVersion.content,
      version: newVersion,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });

    // Create new version entry for the rollback
    await ctx.db.insert("documentVersions", {
      documentId: args.documentId,
      content: targetVersion.content,
      version: newVersion,
      createdBy: userId,
      createdAt: Date.now(),
      changeDescription: `Rolled back to version ${args.version}`,
    });

    // Log audit event
    await ctx.db.insert("auditLogs", {
      documentId: args.documentId,
      userId,
      action: "edit",
      details: `Rolled back to version ${args.version}`,
      timestamp: Date.now(),
    });

    return newVersion;
  },
});

export const deleteDocument = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Only creator can delete
    if (document.createdBy !== userId) {
      throw new Error("Only the creator can delete this document");
    }

    // Log audit event before deletion
    await ctx.db.insert("auditLogs", {
      documentId: args.documentId,
      userId,
      action: "delete",
      timestamp: Date.now(),
    });

    // Clean up related data
    const versions = await ctx.db
      .query("documentVersions")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
    
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    const permissions = await ctx.db
      .query("documentPermissions")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();
    
    for (const permission of permissions) {
      await ctx.db.delete(permission._id);
    }

    await ctx.db.delete(args.documentId);
    return true;
  },
});

export const setDocumentFolder = mutation({
  args: {
    documentId: v.id("documents"),
    folderId: v.union(v.id("folders"), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    if (document.createdBy !== userId) {
      throw new Error("Only the creator can manage document folders");
    }

    if (args.folderId) {
      await ensureFolderOwnership(ctx, args.folderId, userId);
    }

    await ctx.db.patch(args.documentId, {
      folderId: args.folderId ?? undefined,
    });

    return true;
  },
});

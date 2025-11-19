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

export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.number()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    documentId: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      assignedTo: args.assignedTo,
      createdBy: userId,
      dueDate: args.dueDate,
      status: "todo",
      priority: args.priority,
      documentId: args.documentId,
      createdAt: Date.now(),
    });

    return taskId;
  },
});

export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("todo"), v.literal("in_progress"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    // Only assigned user or creator can update status
    if (task.assignedTo !== userId && task.createdBy !== userId) {
      throw new Error("You can only update tasks assigned to you or created by you");
    }

    await ctx.db.patch(args.taskId, {
      status: args.status,
    });

    return true;
  },
});

export const updateTaskDetails = mutation({
  args: {
    taskId: v.id("tasks"),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.assignedTo !== userId && task.createdBy !== userId) {
      throw new Error("You can only edit tasks assigned to you or created by you");
    }

    const updates: Record<string, any> = {};
    if (args.description !== undefined) updates.description = args.description;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.priority !== undefined) updates.priority = args.priority;

    await ctx.db.patch(args.taskId, updates);
    return true;
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUser(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.assignedTo !== userId && task.createdBy !== userId) {
      throw new Error("You can only delete tasks assigned to you or created by you");
    }

    await ctx.db.delete(args.taskId);
    return true;
  },
});

export const getUserTasks = query({
  args: { includeCompleted: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const assignedTasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assignedTo", userId))
      .collect();

    const createdTasks = await ctx.db
      .query("tasks")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .collect();

    const allTasks = [...assignedTasks, ...createdTasks];
    const uniqueTasks = allTasks.filter((task, index, self) => 
      index === self.findIndex(t => t._id === task._id)
    );

    let filteredTasks = uniqueTasks;
    if (!args.includeCompleted) {
      filteredTasks = uniqueTasks.filter(task => task.status !== "completed");
    }

    // Get creator and assignee information
    const tasksWithUsers = await Promise.all(
      filteredTasks.map(async (task) => {
        const creator = await ctx.db.get(task.createdBy);
        const assignee = task.assignedTo ? await ctx.db.get(task.assignedTo) : null;
        
        return {
          ...task,
          creator: creator ? { name: creator.name, email: creator.email } : null,
          assignee: assignee ? { name: assignee.name, email: assignee.email } : null,
        };
      })
    );

    return tasksWithUsers.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return a.dueDate - b.dueDate;
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt - a.createdAt;
    });
  },
});

export const getDocumentTasks = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    const tasksWithUsers = await Promise.all(
      tasks.map(async (task) => {
        const creator = await ctx.db.get(task.createdBy);
        const assignee = task.assignedTo ? await ctx.db.get(task.assignedTo) : null;
        
        return {
          ...task,
          creator: creator ? { name: creator.name, email: creator.email } : null,
          assignee: assignee ? { name: assignee.name, email: assignee.email } : null,
        };
      })
    );

    return tasksWithUsers;
  },
});

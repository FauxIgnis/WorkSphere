import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  PaperAirplaneIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface TaskPanelProps {
  documentId: string | null;
}

export function TaskPanel({ documentId }: TaskPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: "",
  });

  const tasks = useQuery(api.tasks.getUserTasks, { includeCompleted: false }) || [];
  const documentTasks = useQuery(
    api.tasks.getDocumentTasks,
    documentId ? { documentId: documentId as Id<"documents"> } : "skip"
  ) || [];

  const createTask = useMutation(api.tasks.createTask);
  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await createTask({
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).getTime() : undefined,
        documentId: documentId as Id<"documents"> | undefined,
      });

      setNewTask({ title: "", description: "", priority: "medium", dueDate: "" });
      setShowCreateForm(false);
      toast.success("Task created successfully");
    } catch (error) {
      toast.error("Failed to create task");
      console.error("Create task error:", error);
    }
  };

  const handleStatusChange = async (taskId: string, status: "todo" | "in_progress" | "completed") => {
    try {
      await updateTaskStatus({
        taskId: taskId as Id<"tasks">,
        status,
      });
      toast.success("Task status updated");
    } catch (error) {
      toast.error("Failed to update task status");
      console.error("Update task error:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-rose-600 bg-rose-50 border border-rose-200";
      case "medium":
        return "text-amber-600 bg-amber-50 border border-amber-200";
      case "low":
        return "text-emerald-600 bg-emerald-50 border border-emerald-200";
      default:
        return "text-neutral-600 bg-neutral-50 border border-neutral-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-emerald-600 bg-emerald-50";
      case "in_progress":
        return "text-blue-600 bg-blue-50";
      case "todo":
        return "text-neutral-500 bg-neutral-100";
      default:
        return "text-neutral-500 bg-neutral-100";
    }
  };

  const displayTasks = documentId ? documentTasks : tasks;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fdfcf8]">
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <div className="rounded-3xl border border-neutral-200/70 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-neutral-400">Taskboard</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-900">
                  {documentId ? "Document Tasks" : "My Tasks"}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {documentId
                    ? "Track progress and collaborate on tasks connected to this document."
                    : "Manage your personal and shared assignments across the workspace."
                  }
                </p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700"
              >
                <PlusIcon className="h-4 w-4" />
                New Task
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-sm">
            {showCreateForm && (
              <div className="border-b border-neutral-200/70 bg-[#f7f6f3]/60 px-6 py-6">
                <form onSubmit={handleCreateTask} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Task Title
                    </label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                      placeholder="Outline the task..."
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Description
                    </label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                      rows={3}
                      placeholder="Provide helpful context for collaborators..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Priority
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as "low" | "medium" | "high" })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      Create Task
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-5 py-2 text-sm font-medium text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {displayTasks.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-[#f7f6f3]/60 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                    <CheckCircleIcon className="h-8 w-8 text-neutral-400" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-neutral-900">No tasks yet</h3>
                  <p className="mt-2 max-w-md text-sm text-neutral-500">
                    {documentId
                      ? "Create tasks linked to this document to align your team and track progress."
                      : "Capture your next actions and assign work to teammates to keep momentum."
                    }
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-800"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add your first task
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayTasks.map((task) => (
                    <div
                      key={task._id}
                      className="rounded-2xl border border-neutral-200/80 bg-white px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-semibold text-neutral-900">{task.title}</h3>
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${getPriorityColor(task.priority)}`}>
                              Priority · {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                          </div>

                          {task.description && (
                            <p className="mt-3 text-sm text-neutral-600">{task.description}</p>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
                            {task.creator && (
                              <span className="inline-flex items-center gap-1 text-neutral-500 normal-case tracking-normal">
                                <UserIcon className="h-4 w-4 text-neutral-400" />
                                Created by {task.creator.name}
                              </span>
                            )}

                            {task.assignee && (
                              <span className="inline-flex items-center gap-1 text-neutral-500 normal-case tracking-normal">
                                <UserIcon className="h-4 w-4 text-neutral-400" />
                                Assigned to {task.assignee.name}
                              </span>
                            )}

                            <span className="inline-flex items-center gap-1 text-neutral-500 normal-case tracking-normal">
                              <ClockIcon className="h-4 w-4 text-neutral-400" />
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-stretch gap-3 md:w-56">
                          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${getStatusColor(task.status)}`}>
                            {task.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>

                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => handleStatusChange(task._id, "todo")}
                              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${task.status === 'todo' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'}`}
                            >
                              To Do
                            </button>
                            <button
                              onClick={() => handleStatusChange(task._id, "in_progress")}
                              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${task.status === 'in_progress' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'}`}
                            >
                              In Progress
                            </button>
                            <button
                              onClick={() => handleStatusChange(task._id, "completed")}
                              className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${task.status === 'completed' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'}`}
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

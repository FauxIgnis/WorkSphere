import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface GoalsPanelProps {
  documentId: string | null;
}

export function GoalsPanel({ documentId }: GoalsPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: "",
    startTime: "",
    endTime: "",
    location: "",
  });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [sortMode, setSortMode] = useState<"priority" | "created" | "status">("priority");
  const [taskForm, setTaskForm] = useState({
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: "",
    startTime: "",
    endTime: "",
    location: "",
  });

  const tasks = useQuery(api.tasks.getUserTasks, { includeCompleted: true }) || [];
  const documentTasks = useQuery(
    api.tasks.getDocumentTasks,
    documentId ? { documentId: documentId as Id<"documents"> } : "skip"
  ) || [];

  const createTask = useMutation(api.tasks.createTask);
  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);
  const updateTaskDetails = useMutation(api.tasks.updateTaskDetails);
  const deleteTask = useMutation(api.tasks.deleteTask);

  const toTimestamp = (value: string) => (value ? new Date(value).getTime() : undefined);
  const toDateTimeInput = (value?: number) =>
    value ? new Date(value).toISOString().slice(0, 16) : "";
  const formatDateLabel = (value?: number) =>
    value
      ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" })
      : "No due date";
  const formatDateTimeLabel = (value?: number) =>
    value
      ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : null;

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await createTask({
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        dueDate: toTimestamp(newTask.dueDate),
        startTime: toTimestamp(newTask.startTime),
        endTime: toTimestamp(newTask.endTime),
        location: newTask.location || undefined,
        documentId: documentId ? (documentId as Id<"documents">) : undefined,
      });

      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
        startTime: "",
        endTime: "",
        location: "",
      });
      setShowCreateForm(false);
      toast.success("Goal created successfully");
    } catch (error) {
      toast.error("Failed to create task");
      console.error("Create task error:", error);
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTaskId(task._id);
    setTaskForm({
      description: task.description || "",
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
      startTime: toDateTimeInput(task.startTime),
      endTime: toDateTimeInput(task.endTime),
      location: task.location || "",
    });
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId) return;

    try {
      await updateTaskDetails({
        taskId: editingTaskId as Id<"tasks">,
        description: taskForm.description || undefined,
        priority: taskForm.priority,
        dueDate: toTimestamp(taskForm.dueDate),
        startTime: toTimestamp(taskForm.startTime),
        endTime: toTimestamp(taskForm.endTime),
        location: taskForm.location || undefined,
      });
      toast.success("Goal updated");
      setEditingTaskId(null);
    } catch (error) {
      console.error("Update task error:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = window.confirm("Delete this task? This cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteTask({ taskId: taskId as Id<"tasks"> });
      toast.success("Goal deleted");
      if (editingTaskId === taskId) {
        setEditingTaskId(null);
      }
    } catch (error) {
      console.error("Delete task error:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleStatusChange = async (
    taskId: string,
    status: "todo" | "in_progress" | "completed",
    successMessage?: string
  ) => {
    try {
      await updateTaskStatus({
        taskId: taskId as Id<"tasks">,
        status,
      });
      toast.success(successMessage || "Goal status updated");
    } catch (error) {
      toast.error("Failed to update task status");
      console.error("Update task error:", error);
    }
  };

  const handleRestoreTask = async (taskId: string) => {
    await handleStatusChange(taskId, "in_progress", "Goal restored to In Progress");
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

  const baseTasks = documentId ? documentTasks : tasks;
  const archivedTasks = baseTasks.filter((task) => task.status === "completed");
  const priorityOrder: Record<"high" | "medium" | "low", number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const displayTasks = baseTasks
    .filter((task) => task.status !== "completed")
    .slice()
    .sort((a, b) => {
      if (sortMode === "created") {
        return b.createdAt - a.createdAt;
      }

      if (sortMode === "status") {
        const statusOrder: Record<"todo" | "in_progress" | "completed", number> = {
          in_progress: 0,
          todo: 1,
          completed: 2,
        };
        const statusDiff = statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
        if (statusDiff !== 0) {
          return statusDiff;
        }
      }

      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      const aDue = a.dueDate || Number.MAX_SAFE_INTEGER;
      const bDue = b.dueDate || Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    });

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fdfcf8]">
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <div className="rounded-3xl border border-neutral-200/70 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-900">
                  {documentId ? "Document Goals" : "My Goals"}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {documentId
                    ? "Track progress and collaborate on goals connected to this document."
                    : "Manage your personal and shared objectives across the workspace."
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium text-neutral-600">
                  <span className="text-xs uppercase tracking-[0.2em] text-neutral-400">Sort by</span>
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                  >
                    <option value="priority">Priority</option>
                    <option value="created">Creation date</option>
                    <option value="status">Status</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowArchive(!showArchive)}
                  className={`inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition ${
                    showArchive
                      ? "border-neutral-900 text-neutral-900"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-800"
                  }`}
                >
                  Archive
                  {archivedTasks.length > 0 && (
                    <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-semibold text-white">
                      {archivedTasks.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  New Goal
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-sm">
            {showCreateForm && (
              <div className="border-b border-neutral-200/70 bg-[#f7f6f3]/60 px-6 py-6">
                <form onSubmit={handleCreateTask} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Goal Title
                    </label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                      placeholder="Outline the goal..."
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

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newTask.startTime}
                      onChange={(e) => setNewTask({ ...newTask, startTime: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newTask.endTime}
                      onChange={(e) => setNewTask({ ...newTask, endTime: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                      Location
                    </label>
                    <input
                      type="text"
                      value={newTask.location}
                      onChange={(e) => setNewTask({ ...newTask, location: e.target.value })}
                      placeholder="Add a room, link, or address"
                      className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      Create Goal
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
                  <h3 className="mt-6 text-lg font-semibold text-neutral-900">No goals yet</h3>
                  <p className="mt-2 max-w-md text-sm text-neutral-500">
                    {documentId
                      ? "Create goals linked to this document to align your team and track progress."
                      : "Capture your next objectives and assign work to teammates to keep momentum."
                    }
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-800"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add your first goal
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayTasks.map((task) => {
                    const isEditing = editingTaskId === task._id;
                    return (
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

                            <div className="inline-flex flex-wrap items-center gap-2 text-neutral-500 normal-case tracking-normal">
                              <span className="inline-flex items-center gap-1">
                                <ClockIcon className="h-4 w-4 text-neutral-400" />
                                {formatDateLabel(task.dueDate)}
                              </span>
                              <span className="ml-1 flex gap-1">
                                <button
                                  onClick={() => handleEditTask(task)}
                                  className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                                  title="Edit task"
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task._id)}
                                  className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-red-500"
                                  title="Delete task"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </span>
                            </div>

                            {task.startTime && (
                              <span className="inline-flex items-center gap-1 text-neutral-500 normal-case tracking-normal">
                                <ClockIcon className="h-4 w-4 text-neutral-400" />
                                Start · {formatDateTimeLabel(task.startTime)}
                              </span>
                            )}

                            {task.endTime && (
                              <span className="inline-flex items-center gap-1 text-neutral-500 normal-case tracking-normal">
                                <ClockIcon className="h-4 w-4 text-neutral-400" />
                                End · {formatDateTimeLabel(task.endTime)}
                              </span>
                            )}

                            {task.location && (
                              <span className="inline-flex items-center gap-1 text-neutral-500 normal-case tracking-normal">
                                <MapPinIcon className="h-4 w-4 text-neutral-400" />
                                {task.location}
                              </span>
                            )}
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

                      {isEditing && (
                        <div className="mt-4 rounded-2xl border border-neutral-200 bg-[#f7f6f3]/60 px-4 py-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-neutral-700">Edit Goal</h4>
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="rounded-full p-1 text-neutral-400 transition hover:bg-neutral-200"
                              title="Close editor"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                          <form onSubmit={handleUpdateTask} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                                Description
                              </label>
                              <textarea
                                value={taskForm.description}
                                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                                rows={3}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                                Priority
                              </label>
                              <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as "low" | "medium" | "high" })}
                                className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                                Due Date
                              </label>
                              <input
                                type="date"
                                value={taskForm.dueDate}
                                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                                Start Time
                              </label>
                              <input
                                type="datetime-local"
                                value={taskForm.startTime}
                                onChange={(e) => setTaskForm({ ...taskForm, startTime: e.target.value })}
                                className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                                End Time
                              </label>
                              <input
                                type="datetime-local"
                                value={taskForm.endTime}
                                onChange={(e) => setTaskForm({ ...taskForm, endTime: e.target.value })}
                                className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                                Location
                              </label>
                              <input
                                type="text"
                                value={taskForm.location}
                                onChange={(e) => setTaskForm({ ...taskForm, location: e.target.value })}
                                className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
                                placeholder="Add a room, link, or address"
                              />
                            </div>
                            <div className="md:col-span-2 flex flex-wrap gap-2">
                              <button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
                              >
                                Save changes
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTaskId(null)}
                                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
              {showArchive && (
                <div className="mt-8 rounded-2xl border border-neutral-200 bg-white px-5 py-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900">Archived Goals</h3>
                      <p className="text-sm text-neutral-500">
                        Goals marked as done are stored here. Restore them anytime.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowArchive(false)}
                      className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-800"
                    >
                      Close
                    </button>
                  </div>
                  {archivedTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-200 bg-[#f7f6f3]/60 px-4 py-6 text-center text-sm text-neutral-500">
                      No archived goals yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {archivedTasks.map((task) => (
                        <div
                          key={task._id}
                          className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-700 shadow-sm"
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-base font-semibold text-neutral-900">{task.title}</p>
                              <p className="text-xs text-neutral-500">
                                Completed on{" "}
                                {task.dueDate
                                  ? new Date(task.dueDate).toLocaleDateString()
                                  : new Date(task.createdAt).toLocaleDateString()}
                              </p>
                              {task.description && (
                                <p className="mt-2 text-sm text-neutral-600">{task.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRestoreTask(task._id)}
                              className="inline-flex items-center justify-center rounded-full border border-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-900 transition hover:bg-neutral-900 hover:text-white"
                            >
                              Restore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  FolderIcon,
  PlusIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ArrowUpTrayIcon,
  PaperClipIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface CasePanelProps {
  selectedCaseId: string | null;
  onCaseSelect: (caseId: string | null) => void;
}

type MessageSource = {
  documentId: string;
  page?: number;
  preview?: string;
};

type CaseChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  sources?: MessageSource[];
  pending?: boolean;
};

export function CasePanel({ selectedCaseId, onCaseSelect }: CasePanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCaseName, setNewCaseName] = useState("");
  const [newCaseDescription, setNewCaseDescription] = useState("");
  const [editingCase, setEditingCase] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showAIChat, setShowAIChat] = useState(false);
  const [messages, setMessages] = useState<CaseChatMessage[]>([]);
  const [userMessage, setUserMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isUploadingCaseFile, setIsUploadingCaseFile] = useState(false);
  const chatMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const caseFileInputRef = useRef<HTMLInputElement | null>(null);

  const cases = useQuery(api.cases.getUserCases) || [];
  const selectedCase = useQuery(
    api.cases.getCase,
    selectedCaseId ? { caseId: selectedCaseId as Id<"cases"> } : "skip"
  );
  const caseDocuments = useQuery(
    api.cases.getCaseDocuments,
    selectedCaseId ? { caseId: selectedCaseId as Id<"cases"> } : "skip"
  ) || [];
  const caseMessagesData = useQuery(
    api.cases.getCaseMessages,
    selectedCaseId ? { caseId: selectedCaseId as Id<"cases"> } : "skip"
  );
  const userDocuments = useQuery(api.documents.listUserDocuments) || [];
  const caseFiles =
    useQuery(
      api.files.getCaseFiles,
      selectedCaseId ? { caseId: selectedCaseId as Id<"cases"> } : "skip"
    ) || [];

  const createCase = useMutation(api.cases.createCase);
  const updateCase = useMutation(api.cases.updateCase);
  const deleteCase = useMutation(api.cases.deleteCase);
  const addDocumentToCase = useMutation(api.cases.addDocumentToCase);
  const removeDocumentFromCase = useMutation(api.cases.removeDocumentFromCase);
  const sendMessageToCaseAI = useAction(api.cases.sendMessageToCaseAI);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const deleteCaseFile = useMutation(api.files.deleteFile);

  useEffect(() => {
    if (!selectedCaseId) {
      setMessages([]);
      setUserMessage("");
      return;
    }
  }, [selectedCaseId]);

  useEffect(() => {
    if (!caseMessagesData) return;

    const normalizedMessages: CaseChatMessage[] = [...caseMessagesData]
  .sort((a, b) => a.timestamp - b.timestamp)
  .map((msg) => ({
    id: String(msg._id ?? msg.id ?? msg.timestamp),
    role: msg.isAI ? "assistant" : "user",
    text: msg.content,
    createdAt: msg.timestamp,
    sources: [],
  }));

    setMessages(normalizedMessages);
  }, [caseMessagesData]);

  useEffect(() => {
    if (!showAIChat) return;
    const container = chatMessagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, showAIChat]);

  const scrollChatToBottom = () => {
    requestAnimationFrame(() => {
      const container = chatMessagesContainerRef.current;
      if (!container) return;
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    });
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseName.trim()) return;

    try {
      const caseId = await createCase({
        name: newCaseName,
        description: newCaseDescription || undefined,
      });
      onCaseSelect(caseId);
      setNewCaseName("");
      setNewCaseDescription("");
      setShowCreateForm(false);
      toast.success("Case created successfully");
    } catch (error) {
      toast.error("Failed to create case");
      console.error("Create case error:", error);
    }
  };

  const handleUpdateCase = async (caseId: string) => {
    try {
      await updateCase({
        caseId: caseId as Id<"cases">,
        name: editName,
        description: editDescription || undefined,
      });
      setEditingCase(null);
      toast.success("Case updated successfully");
    } catch (error) {
      toast.error("Failed to update case");
      console.error("Update case error:", error);
    }
  };

  const handleDeleteCase = async (caseId: string, caseName: string) => {
    if (!confirm(`Are you sure you want to delete the case "${caseName}"? This will remove all documents from the case but won't delete the documents themselves.`)) {
      return;
    }

    try {
      await deleteCase({ caseId: caseId as Id<"cases"> });
      if (selectedCaseId === caseId) {
        onCaseSelect(null);
      }
      toast.success("Case deleted successfully");
    } catch (error) {
      toast.error("Failed to delete case");
      console.error("Delete case error:", error);
    }
  };

  const handleAddDocument = async (documentId: string) => {
    if (!selectedCaseId) return;

    try {
      await addDocumentToCase({
        caseId: selectedCaseId as Id<"cases">,
        documentId: documentId as Id<"documents">,
      });
      toast.success("Document added to case");
    } catch (error: any) {
      toast.error(error.message || "Failed to add document to case");
      console.error("Add document error:", error);
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    if (!selectedCaseId) return;

    try {
      await removeDocumentFromCase({
        caseId: selectedCaseId as Id<"cases">,
        documentId: documentId as Id<"documents">,
      });
      toast.success("Document removed from case");
    } catch (error) {
      toast.error("Failed to remove document from case");
      console.error("Remove document error:", error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedCaseId) return;
    const trimmedMessage = userMessage.trim();
    if (!trimmedMessage) return;
    if (caseDocuments.length === 0) return;

    const tempMessage: CaseChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      text: trimmedMessage,
      createdAt: Date.now(),
      sources: [],
      pending: true,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setUserMessage("");
    setIsSendingMessage(true);
    scrollChatToBottom();

    try {
      await sendMessageToCaseAI({
        caseId: selectedCaseId as Id<"cases">,
        content: trimmedMessage,
      });
    } catch (error: any) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));
      toast.error(error?.message || "Failed to send message to Case AI");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleCaseFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!selectedCaseId) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF or Word files can be uploaded");
      event.target.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size must be less than 15MB");
      event.target.value = "";
      return;
    }

    setIsUploadingCaseFile(true);

    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await uploadResponse.json();

      await saveFile({
        name: file.name,
        type: file.type,
        size: file.size,
        storageId,
        caseId: selectedCaseId as Id<"cases">,
      });

      toast.success("File uploaded to case");
    } catch (error) {
      console.error("Case file upload error", error);
      toast.error("Failed to upload file");
    } finally {
      if (caseFileInputRef.current) {
        caseFileInputRef.current.value = "";
      }
      setIsUploadingCaseFile(false);
    }
  };

  const handleDeleteCaseFileClick = async (fileId: string, fileName: string) => {
    if (
      !confirm(`Delete the file "${fileName}" from this case? This cannot be undone.`)
    ) {
      return;
    }

    try {
      await deleteCaseFile({ fileId: fileId as Id<"files"> });
      toast.success("File deleted");
    } catch (error) {
      console.error("Delete case file error", error);
      toast.error("Failed to delete file");
    }
  };

  const availableDocuments = userDocuments.filter(
    (doc) =>
      doc && !doc.caseId && !caseDocuments.some((caseDoc) => caseDoc._id === doc._id)
  );

  const canSendMessages = caseDocuments.length > 0;

  const getDocumentTitle = (documentId: string) => {
    const doc = caseDocuments.find((document) => String(document._id) === documentId);
    return doc?.title || `Document ${documentId.slice(0, 6)}...`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fdfcf8]">
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 px-6 py-8">
          <div className="rounded-3xl border border-neutral-200/70 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-neutral-400">Case Management</p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-900">Organize Your Matters</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Group related documents, collaborate with your team, and unlock AI insights per case.
                </p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700"
              >
                <PlusIcon className="h-4 w-4" />
                New Case
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-6 lg:flex-row">
            <div className="flex w-full flex-col rounded-3xl border border-neutral-200/70 bg-white shadow-sm lg:max-w-xs">
              <div className="border-b border-neutral-200/70 px-5 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">Your Cases</p>
                    <p className="mt-1 text-sm text-neutral-500">{cases.length} active</p>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-800"
                    title="Create case"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {showCreateForm && (
                <div className="border-b border-neutral-200/70 bg-[#f7f6f3]/60 px-5 py-5">
                  <form onSubmit={handleCreateCase} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                        Case Name
                      </label>
                      <input
                        type="text"
                        value={newCaseName}
                        onChange={(e) => setNewCaseName(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                        placeholder="e.g. Johnson vs. State"
                        autoFocus
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
                        Description
                      </label>
                      <textarea
                        value={newCaseDescription}
                        onChange={(e) => setNewCaseDescription(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                        rows={2}
                        placeholder="Optional context or notes"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-100 transition hover:bg-neutral-700"
                      >
                        <CheckIcon className="h-3 w-3" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-700"
                      >
                        <XMarkIcon className="h-3 w-3" />
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-5 py-5">
                {cases.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-[#f7f6f3]/60 px-4 py-12 text-center">
                    <FolderIcon className="h-10 w-10 text-neutral-400" />
                    <h3 className="mt-4 text-sm font-semibold text-neutral-900">No cases yet</h3>
                    <p className="mt-2 text-xs text-neutral-500">
                      Create your first case to start organizing documents and discussions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cases.map((caseItem) => (
                      <div
                        key={caseItem._id}
                        className={`group rounded-2xl border px-4 py-4 transition ${
                          selectedCaseId === caseItem._id
                            ? "border-neutral-900 bg-neutral-900/90 text-neutral-100 shadow-sm"
                            : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-md"
                        }`}
                        onClick={() => onCaseSelect(caseItem._id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {editingCase === caseItem._id ? (
                              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                                />
                                <textarea
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdateCase(caseItem._id)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-neutral-100 transition hover:bg-neutral-700"
                                  >
                                    <CheckIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingCase(null)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-700"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <h4
                                  className={`truncate text-sm font-semibold ${
                                    selectedCaseId === caseItem._id
                                      ? "text-neutral-100"
                                      : "text-neutral-900"
                                  }`}
                                >
                                  {caseItem.name}
                                </h4>
                                {caseItem.description && (
                                  <p
                                    className={`line-clamp-2 text-xs ${
                                      selectedCaseId === caseItem._id
                                        ? "text-neutral-200/90"
                                        : "text-neutral-500"
                                    }`}
                                  >
                                    {caseItem.description}
                                  </p>
                                )}
                                <div
                                  className={`flex items-center justify-between text-[11px] uppercase tracking-[0.25em] ${
                                    selectedCaseId === caseItem._id
                                      ? "text-neutral-200"
                                      : "text-neutral-400"
                                  }`}
                                >
                                  <span>
                                    {caseItem.documentCount}/30 docs • {formatFileSize(caseItem.totalSize)}/50MB
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCase(caseItem._id);
                                        setEditName(caseItem.name);
                                        setEditDescription(caseItem.description || "");
                                      }}
                                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs transition ${
                                        selectedCaseId === caseItem._id
                                          ? "border-neutral-700 text-neutral-200 hover:border-neutral-500"
                                          : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                                      }`}
                                      title="Edit case"
                                    >
                                      <PencilIcon className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCase(caseItem._id, caseItem.name);
                                      }}
                                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs transition ${
                                        selectedCaseId === caseItem._id
                                          ? "border-neutral-700 text-rose-200 hover:border-rose-400"
                                          : "border-neutral-200 text-rose-500 hover:border-rose-300 hover:text-rose-600"
                                      }`}
                                      title="Delete case"
                                    >
                                      <TrashIcon className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-sm">
              {selectedCase ? (
                <div className={`flex h-full flex-col ${showAIChat ? "lg:grid lg:grid-cols-[1fr,360px]" : ""}`}>
                  <div className="flex h-full flex-col">
                    <div className="border-b border-neutral-200/70 bg-[#f7f6f3]/60 px-6 py-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-neutral-900">{selectedCase.name}</h3>
                          {selectedCase.description && (
                            <p className="mt-2 text-sm text-neutral-500">{selectedCase.description}</p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
                            <span>{selectedCase.documentCount}/30 Documents</span>
                            <span>•</span>
                            <span>{formatFileSize(selectedCase.totalSize)}/50MB Used</span>
                            {selectedCase.documentCount >= 30 && (
                              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-600">
                                <ExclamationTriangleIcon className="h-4 w-4" />
                                Limit Reached
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setShowAIChat(!showAIChat)}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                            showAIChat
                              ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                              : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                          }`}
                        >
                          <SparklesIcon className="h-4 w-4" />
                          Case AI Chat
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                      <section>
                        <div className="mb-4 flex items-center justify-between">
                          <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">Documents in Case</h4>
                          <span className="text-xs text-neutral-400">{caseDocuments.length} total</span>
                        </div>
                        {caseDocuments.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-neutral-200 bg-[#f7f6f3]/60 px-6 py-12 text-center">
                            <FolderIcon className="mx-auto h-10 w-10 text-neutral-400" />
                            <p className="mt-4 text-sm font-semibold text-neutral-900">No documents in this case yet</p>
                            <p className="mt-2 text-xs text-neutral-500">Add documents from your library below to start collaborating.</p>
                          </div>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {caseDocuments.map((doc) => (
                              <div
                                key={doc._id}
                                className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 flex-1 items-start gap-2">
                                    <DocumentTextIcon className="h-5 w-5 text-neutral-500" />
                                    <div className="min-w-0">
                                      <h5 className="truncate text-sm font-semibold text-neutral-900">{doc.title}</h5>
                                      <p className="mt-1 text-xs text-neutral-400">
                                        Modified {new Date(doc.lastModifiedAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveDocument(doc._id)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-700"
                                    title="Remove from case"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>

                      {availableDocuments.length > 0 && (
                        <section>
                          <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">Add Documents to Case</h4>
                            <span className="text-xs text-neutral-400">{availableDocuments.length} available</span>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {availableDocuments.map((doc) => {
                              if (!doc) return null;
                              return (
                                <div
                                  key={doc._id}
                                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 flex-1 items-start gap-2">
                                      <DocumentTextIcon className="h-5 w-5 text-neutral-500" />
                                      <div className="min-w-0">
                                        <h5 className="truncate text-sm font-semibold text-neutral-900">{doc.title}</h5>
                                        <p className="mt-1 text-xs text-neutral-400">
                                          Modified {new Date(doc.lastModifiedAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleAddDocument(doc._id)}
                                      disabled={selectedCase.documentCount >= 30}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-700 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300"
                                      title="Add to case"
                                    >
                                      <PlusIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      )}

                      <section>
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
                              Case Files
                            </h4>
                            <p className="text-xs text-neutral-400">
                              Upload optional Word or PDF files for this case
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              ref={caseFileInputRef}
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              className="hidden"
                              onChange={handleCaseFileChange}
                              disabled={isUploadingCaseFile}
                            />
                            <button
                              onClick={() => caseFileInputRef.current?.click()}
                              disabled={isUploadingCaseFile}
                              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900 disabled:cursor-not-allowed disabled:border-neutral-200"
                            >
                              <ArrowUpTrayIcon className="h-4 w-4" />
                              {isUploadingCaseFile ? "Uploading..." : "Upload"}
                            </button>
                          </div>
                        </div>

                        {caseFiles.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-neutral-200 bg-[#f7f6f3]/60 px-6 py-6 text-center">
                            <PaperClipIcon className="mx-auto h-8 w-8 text-neutral-400" />
                            <p className="mt-3 text-sm font-semibold text-neutral-900">No files uploaded yet</p>
                            <p className="mt-1 text-xs text-neutral-500">Attach briefs, filings, or supporting records as needed.</p>
                          </div>
                        ) : (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {caseFiles.map((file) => (
                              <div
                                key={file._id}
                                className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex flex-1 items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100">
                                      <PaperClipIcon className="h-5 w-5 text-neutral-500" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-neutral-900">
                                        {file.name}
                                      </p>
                                      <p className="mt-1 text-xs text-neutral-500">
                                        {formatFileSize(file.size)} • {file.type.includes("pdf") ? "PDF" : "Word"}
                                      </p>
                                      {file.uploader?.name && (
                                        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                                          Uploaded by {file.uploader.name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-700"
                                      title="Download"
                                    >
                                      <ArrowDownTrayIcon className="h-4 w-4" />
                                    </a>
                                    <button
                                      onClick={() => handleDeleteCaseFileClick(file._id, file.name)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-700"
                                      title="Delete file"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>
                  </div>

                  {showAIChat && (
                    <div className="hidden h-full flex-col border-t border-neutral-200/70 bg-[#f7f6f3]/60 lg:flex lg:border-l lg:border-t-0">
                      <div className="flex items-center justify-between border-b border-neutral-200/70 px-6 py-4">
                        <div className="flex items-center gap-2">
                          <SparklesIcon className="h-5 w-5 text-indigo-500" />
                          <h3 className="text-sm font-semibold text-neutral-900">Case AI Assistant</h3>
                        </div>
                        <button
                          onClick={() => setShowAIChat(false)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex h-full flex-col px-6 py-4">
                        <div
                          ref={chatMessagesContainerRef}
                          className="flex-1 space-y-4 overflow-y-auto pr-1"
                        >
                          {messages.length === 0 && !isSendingMessage ? (
                            <div className="mt-8 rounded-2xl border border-dashed border-neutral-200 bg-white/80 px-4 py-6 text-center text-xs text-neutral-500">
                              Ask questions about all documents in this case to receive tailored insights.
                            </div>
                          ) : (
                            messages
                              .sort((a, b) => a.createdAt - b.createdAt)
                              .map((message) => (
                                <div
                                  key={message.id}
                                  className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                                    message.role === "assistant"
                                      ? "border-indigo-100 bg-white"
                                      : "border-neutral-200 bg-white"
                                  }`}
                                >
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
                                    {message.role === "assistant" ? "Assistant" : "You"}
                                  </div>
                                  <p className="mt-2 whitespace-pre-line text-sm text-neutral-800">{message.text}</p>
                                  {message.sources && message.sources.length > 0 && (
                                    <div className="mt-3 rounded-xl bg-neutral-50 p-3">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
                                        Sources
                                      </p>
                                      <ul className="mt-2 space-y-2 text-xs text-neutral-600">
                                        {message.sources.map((source, index) => (
                                          <li
                                            key={`${message.id}-source-${index}`}
                                            className="rounded-lg border border-neutral-200 bg-white px-3 py-2"
                                          >
                                            <p className="font-medium text-neutral-800">{getDocumentTitle(source.documentId)}</p>
                                            <p className="text-[11px] text-neutral-500">
                                              Page {source.page ?? "-"}
                                            </p>
                                            {source.preview && (
                                              <p className="mt-1 text-neutral-600">{source.preview}</p>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))
                          )}

                          {isSendingMessage && (
                            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-neutral-200 bg-white/80 px-3 py-2 text-xs text-neutral-500">
                              <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                              Waiting for AI response...
                            </div>
                          )}
                        </div>

                        <div className="mt-4 border-t border-neutral-200/70 pt-4">
                          {canSendMessages ? (
                            <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                              <textarea
                                value={userMessage}
                                onChange={(e) => setUserMessage(e.target.value)}
                                placeholder="Ask a question about this case..."
                                rows={3}
                                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                                disabled={isSendingMessage}
                              />
                              <button
                                type="submit"
                                disabled={isSendingMessage || !userMessage.trim()}
                                className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
                              >
                                {isSendingMessage ? "Thinking..." : "Send"}
                              </button>
                            </form>
                          ) : (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                              <div className="flex items-center gap-2 font-semibold">
                                <ExclamationTriangleIcon className="h-4 w-4" />
                                Add at least one document to use the AI chat.
                              </div>
                              <p className="mt-1 text-xs text-amber-700/80">
                                Attach documents to this case so the assistant has context for your questions.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
                    <FolderIcon className="h-10 w-10 text-neutral-400" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-neutral-900">No Case Selected</h3>
                  <p className="mt-2 max-w-sm text-sm text-neutral-500">
                    Select a case from the sidebar or create a new one to start organizing your legal materials.
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-800"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Create a case
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

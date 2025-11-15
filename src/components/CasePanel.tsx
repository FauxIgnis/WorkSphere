import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
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
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface CasePanelProps {
  selectedCaseId: string | null;
  onCaseSelect: (caseId: string | null) => void;
}

export function CasePanel({ selectedCaseId, onCaseSelect }: CasePanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCaseName, setNewCaseName] = useState("");
  const [newCaseDescription, setNewCaseDescription] = useState("");
  const [editingCase, setEditingCase] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [showAIChat, setShowAIChat] = useState(false);

  const cases = useQuery(api.cases.getUserCases) || [];
  const selectedCase = useQuery(
    api.cases.getCase,
    selectedCaseId ? { caseId: selectedCaseId as Id<"cases"> } : "skip"
  );
  const caseDocuments = useQuery(
    api.cases.getCaseDocuments,
    selectedCaseId ? { caseId: selectedCaseId as Id<"cases"> } : "skip"
  ) || [];
  const userDocuments = useQuery(api.documents.listUserDocuments) || [];

  const createCase = useMutation(api.cases.createCase);
  const updateCase = useMutation(api.cases.updateCase);
  const deleteCase = useMutation(api.cases.deleteCase);
  const addDocumentToCase = useMutation(api.cases.addDocumentToCase);
  const removeDocumentFromCase = useMutation(api.cases.removeDocumentFromCase);

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

  const availableDocuments = userDocuments.filter(
    (doc) =>
      doc && !doc.caseId && !caseDocuments.some((caseDoc) => caseDoc._id === doc._id)
  );

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
                <div className={`flex h-full flex-col ${showAIChat ? "lg:grid lg:grid-cols-[1fr,320px]" : ""}`}>
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
                    </div>
                  </div>

                  {showAIChat && (
                    <div className="hidden border-t border-neutral-200/70 bg-[#f7f6f3]/60 px-6 py-6 lg:block lg:h-full lg:border-l lg:border-t-0">
                      <div className="flex h-full flex-col gap-4">
                        <div className="flex items-center justify-between">
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
                        <p className="text-xs text-neutral-500">
                          Ask questions about all {caseDocuments.length} documents inside this case. Summaries, comparisons, or cross-document analysis are just a prompt away.
                        </p>
                        <div className="flex-1 rounded-2xl border border-dashed border-neutral-200 bg-white/60 px-4 py-8 text-center">
                          <SparklesIcon className="mx-auto h-10 w-10 text-indigo-400" />
                          <h4 className="mt-4 text-sm font-semibold text-neutral-900">Case-wide AI Analysis</h4>
                          <p className="mt-2 text-xs text-neutral-500">
                            Launch the AI chat to explore arguments, highlight conflicts, or request summaries tailored to this case.
                          </p>
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

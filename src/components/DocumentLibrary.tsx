import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  FolderIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { SubscriptionModal } from "./SubscriptionModal";
import { toast } from "sonner";

type FolderFilter = "all" | "ungrouped" | Id<"folders">;

interface DocumentLibraryProps {
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string | null) => void;
}

export function DocumentLibrary({ selectedDocumentId, onSelectDocument }: DocumentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocIsPublic, setNewDocIsPublic] = useState(false);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [folderFormOpen, setFolderFormOpen] = useState(false);
  const [folderEditingId, setFolderEditingId] = useState<Id<"folders"> | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderPickerDocId, setFolderPickerDocId] = useState<Id<"documents"> | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const documents = useQuery(api.documents.listUserDocuments) || [];
  const searchResults =
    useQuery(
      api.documents.searchDocuments,
      searchQuery.length > 2 ? { query: searchQuery } : "skip"
    ) || [];
  const folders = useQuery(api.folders.listUserFolders) || [];
  const subscription = useQuery(api.subscriptions.getUserSubscription);
  const usageCheck = useQuery(api.subscriptions.checkUsageLimit, {
    feature: "documentsCreated",
  });

  const createDocument = useMutation(api.documents.createDocument);
  const incrementUsage = useMutation(api.subscriptions.incrementUsage);
  const setDocumentFolder = useMutation(api.documents.setDocumentFolder);
  const createFolder = useMutation(api.folders.createFolder);
  const updateFolder = useMutation(api.folders.updateFolder);
  const deleteFolder = useMutation(api.folders.deleteFolder);

  const displayedDocuments = searchQuery.length > 2 ? searchResults : documents;

  const sortedDocuments = useMemo(() => {
    return displayedDocuments
      .filter(Boolean)
      .slice()
      .sort((a: any, b: any) => (b?.lastModifiedAt || 0) - (a?.lastModifiedAt || 0));
  }, [displayedDocuments]);

  const filteredDocuments = useMemo(() => {
    if (folderFilter === "all") return sortedDocuments;
    if (folderFilter === "ungrouped") {
      return sortedDocuments.filter((doc: any) => !doc.folderId);
    }
    return sortedDocuments.filter((doc: any) => doc.folderId === folderFilter);
  }, [sortedDocuments, folderFilter]);

  const activeFolder =
    folderFilter !== "all" && folderFilter !== "ungrouped"
      ? folders.find((folder) => folder._id === folderFilter)
      : null;

  const ungroupedCount = useMemo(
    () => documents.filter((doc: any) => !doc?.folderId).length,
    [documents]
  );

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    if (usageCheck && !usageCheck.allowed) {
      setShowSubscriptionModal(true);
      return;
    }

    try {
      const documentId = await createDocument({
        title: newDocTitle,
        content: "",
        isPublic: newDocIsPublic,
        folderId: activeFolder?._id,
      });

      if (subscription?.plan === "free") {
        await incrementUsage({ feature: "documentsCreated" });
      }

      setNewDocTitle("");
      setNewDocIsPublic(false);
      setShowCreateForm(false);
      onSelectDocument(documentId);
    } catch (error) {
      console.error("Failed to create document", error);
      toast.error("Unable to create document. Please try again.");
    }
  };

  const beginCreateFolder = () => {
    setFolderEditingId(null);
    setFolderName("");
    setFolderDescription("");
    setFolderFormOpen(true);
  };

  const beginEditFolder = (folderId: Id<"folders">) => {
    const folder = folders.find((f: any) => f._id === folderId);
    if (!folder) return;
    setFolderEditingId(folder._id);
    setFolderName(folder.name);
    setFolderDescription(folder.description || "");
    setFolderFormOpen(true);
  };

  const resetFolderForm = () => {
    setFolderFormOpen(false);
    setFolderEditingId(null);
    setFolderName("");
    setFolderDescription("");
  };

  const handleFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      if (folderEditingId) {
        await updateFolder({
          folderId: folderEditingId,
          name: folderName,
          description: folderDescription,
        });
        toast.success("Folder updated");
      } else {
        const newFolderId = await createFolder({
          name: folderName,
          description: folderDescription,
        });
        toast.success("Folder created");
        setFolderFilter(newFolderId as FolderFilter);
      }
      resetFolderForm();
    } catch (error) {
      console.error("Failed to save folder", error);
      toast.error("Unable to save folder");
    }
  };

  const handleDeleteFolder = async (folderId: Id<"folders">) => {
    if (!confirm("Deleting a folder keeps the documents but removes their grouping. Continue?")) {
      return;
    }
    try {
      await deleteFolder({ folderId });
      if (folderFilter === folderId) {
        setFolderFilter("all");
      }
      toast.success("Folder deleted");
    } catch (error) {
      console.error("Failed to delete folder", error);
      toast.error("Unable to delete folder");
    }
  };

  const handleAssignDocument = async (docId: Id<"documents">, folderId: Id<"folders"> | null) => {
    try {
      await setDocumentFolder({
        documentId: docId,
        folderId: folderId ?? null,
      });
      setFolderPickerDocId(null);
      toast.success(folderId ? "Document added to folder" : "Document removed from folder");
    } catch (error) {
      console.error("Failed to update folder assignment", error);
      toast.error("Unable to update folder");
    }
  };

  return (
    <aside className="flex w-96 flex-col border-r border-neutral-200 bg-[#f7f6f3]">
      <div className="border-b border-neutral-200 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700">Documents</h3>
            {activeFolder && (
              <p className="text-xs text-neutral-500">
                New documents will be added to <span className="font-medium">{activeFolder.name}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-md border border-neutral-200 p-1.5 text-neutral-500 transition hover:bg-white"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateDocument} className="mb-4 space-y-3 rounded-lg border border-neutral-200 bg-white p-3">
            <input
              type="text"
              placeholder="Document title"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:ring-0"
              autoFocus
            />
            <label className="flex items-center gap-2 text-xs text-neutral-500">
              <input
                type="checkbox"
                checked={newDocIsPublic}
                onChange={(e) => setNewDocIsPublic(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400"
              />
              Make public
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="inline-flex flex-1 items-center justify-center rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
              >
                Cancel
              </button>
            </div>
            {usageCheck && !usageCheck.allowed && (
              <p className="text-xs text-red-500">
                {usageCheck.reason}. Upgrade to unlock more documents.
              </p>
            )}
          </form>
        )}

        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-600 outline-none transition focus:border-neutral-400 focus:ring-0"
          />
        </div>
      </div>

      <div className="border-b border-neutral-200 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-neutral-700">Folders</h4>
            <p className="text-xs text-neutral-500">Group related documents</p>
          </div>
          <button
            onClick={beginCreateFolder}
            className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-white"
          >
            New
          </button>
        </div>

        {folderFormOpen && (
          <form onSubmit={handleFolderSubmit} className="mb-4 space-y-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full rounded-md border border-neutral-200 px-3 py-2 outline-none transition focus:border-neutral-400"
            />
            <textarea
              value={folderDescription}
              onChange={(e) => setFolderDescription(e.target.value)}
              placeholder="Description (optional)"
              className="h-16 w-full rounded-md border border-neutral-200 px-3 py-2 outline-none transition focus:border-neutral-400"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700"
              >
                {folderEditingId ? "Save" : "Create"}
              </button>
              <button
                type="button"
                onClick={resetFolderForm}
                className="inline-flex flex-1 items-center justify-center rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-1 text-sm">
          <button
            onClick={() => setFolderFilter("all")}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 ${
              folderFilter === "all" ? "bg-white font-semibold text-neutral-900 shadow-sm" : "text-neutral-600 hover:bg-white/50"
            }`}
          >
            <span>All documents</span>
            <span className="text-xs text-neutral-500">{documents.length}</span>
          </button>
          <button
            onClick={() => setFolderFilter("ungrouped")}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 ${
              folderFilter === "ungrouped" ? "bg-white font-semibold text-neutral-900 shadow-sm" : "text-neutral-600 hover:bg-white/50"
            }`}
          >
            <span>Unsorted</span>
            <span className="text-xs text-neutral-500">{ungroupedCount}</span>
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {folders.length === 0 && (
            <p className="text-xs text-neutral-500">No folders yet. Create one to start organizing.</p>
          )}
          {folders.map((folder: any) => (
            <div
              key={folder._id}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                folderFilter === folder._id ? "bg-white shadow-sm" : "text-neutral-600 hover:bg-white/60"
              }`}
            >
              <button
                onClick={() => setFolderFilter(folder._id)}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <FolderIcon className="h-4 w-4" />
                <div className="flex-1">
                  <p className="font-medium text-neutral-800">{folder.name}</p>
                  {folder.description && (
                    <p className="text-xs text-neutral-500">{folder.description}</p>
                  )}
                </div>
                <span className="text-xs text-neutral-500">{folder.documentCount}</span>
              </button>
              <div className="flex gap-1 pl-2">
                <button
                  onClick={() => beginEditFolder(folder._id)}
                  className="rounded-md border border-neutral-200 p-1 text-neutral-500 transition hover:bg-white"
                  title="Rename folder"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteFolder(folder._id)}
                  className="rounded-md border border-neutral-200 p-1 text-red-500 transition hover:bg-white"
                  title="Delete folder"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filteredDocuments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 bg-white/70 px-4 py-10 text-center text-neutral-400">
            <FolderIcon className="mx-auto mb-3 h-6 w-6" />
            <p className="text-sm">
              {searchQuery.length > 2 ? "No documents match your search" : "Create a document to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc: any) => {
              const isActive = selectedDocumentId === doc._id;
              return (
                <div
                  key={doc._id}
                  className={`rounded-lg border px-3 py-3 ${
                    isActive ? "border-neutral-400 bg-white shadow-sm" : "border-transparent bg-transparent hover:border-neutral-200 hover:bg-white"
                  }`}
                >
                  <button
                    className="flex w-full items-start justify-between text-left"
                    onClick={() => onSelectDocument(doc._id)}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-medium text-neutral-800">{doc.title}</h4>
                      <p className="mt-1 text-xs text-neutral-400">
                        {new Date(doc.lastModifiedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center">
                      {doc.isPublic ? (
                        <GlobeAltIcon className="h-4 w-4 text-neutral-500" title="Public" />
                      ) : (
                        <LockClosedIcon className="h-4 w-4 text-neutral-300" title="Private" />
                      )}
                    </div>
                  </button>

                  <div className="mt-3">
                    <button
                      onClick={() =>
                        setFolderPickerDocId(folderPickerDocId === doc._id ? null : (doc._id as Id<"documents">))
                      }
                      className="text-xs font-medium text-neutral-500 transition hover:text-neutral-900"
                    >
                      {doc.folderId ? "Move to a different folder" : "Add to folder"}
                    </button>
                    {folderPickerDocId === doc._id && (
                      <div className="mt-2 space-y-1 rounded-md border border-neutral-200 bg-white p-2 text-sm">
                        <button
                          onClick={() => handleAssignDocument(doc._id, null)}
                          className="w-full rounded-md px-2 py-1 text-left text-neutral-600 transition hover:bg-neutral-100"
                        >
                          No folder
                        </button>
                        {folders.length === 0 && (
                          <p className="px-2 py-1 text-xs text-neutral-400">
                            Create a folder to organize this document
                          </p>
                        )}
                        {folders.map((folder: any) => (
                          <button
                            key={folder._id}
                            onClick={() => handleAssignDocument(doc._id, folder._id)}
                            className={`w-full rounded-md px-2 py-1 text-left transition ${
                              doc.folderId === folder._id
                                ? "bg-neutral-900 text-white"
                                : "text-neutral-600 hover:bg-neutral-100"
                            }`}
                          >
                            {folder.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        feature={usageCheck && !usageCheck.allowed ? "document creation" : undefined}
        currentUsage={usageCheck?.currentUsage}
        limit={usageCheck?.limit}
      />
    </aside>
  );
}

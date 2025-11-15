import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { 
  ShareIcon, 
  ClockIcon, 
  ChatBubbleLeftIcon,
  DocumentArrowDownIcon,
  UsersIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  CheckIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { AIChatSidebar } from "./AIChatSidebar";
import { TipTapEditor } from "./TipTapEditor";

const HTML_TAG_REGEX = /<\/?[a-z][^>]*>/i;

const escapeHtml = (input: string) =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeDocumentContent = (rawContent: string | null | undefined) => {
  if (!rawContent) return "";

  if (HTML_TAG_REGEX.test(rawContent)) {
    return rawContent;
  }

  const paragraphs = rawContent.split(/\n{2,}/);

  return paragraphs
    .map((paragraph) => {
      if (!paragraph.trim()) {
        return "<p><br /></p>";
      }

      const lines = paragraph
        .split(/\n/)
        .map((line) => escapeHtml(line.trimEnd()));

      return `<p>${lines.join("<br />")}</p>`;
    })
    .join("");
};

interface DocumentEditorProps {
  documentId: string | null;
  onDocumentChange: (documentId: string | null) => void;
  currentUserName?: string;
}

export function DocumentEditor({ documentId, onDocumentChange, currentUserName }: DocumentEditorProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef("");
  const lastTitleRef = useRef("");

  const document = useQuery(
    api.documents.getDocument,
    documentId ? { documentId: documentId as Id<"documents"> } : "skip"
  );
  
  const versions = useQuery(
    api.documents.getDocumentVersions,
    documentId ? { documentId: documentId as Id<"documents"> } : "skip"
  ) || [];

  const comments = useQuery(
    api.comments.getDocumentComments,
    documentId ? { documentId: documentId as Id<"documents"> } : "skip"
  ) || [];

  const updateDocument = useMutation(api.documents.updateDocument);
  const generateShareableLink = useMutation(api.documents.generateShareableLink);
  const rollbackToVersion = useMutation(api.documents.rollbackToVersion);
  const addComment = useMutation(api.comments.addComment);
  const deleteDocument = useMutation(api.documents.deleteDocument);

  useEffect(() => {
    if (document) {
      const normalizedContent = normalizeDocumentContent(document.content);
      setContent(normalizedContent);
      setTitle(document.title);
      lastContentRef.current = normalizedContent;
      lastTitleRef.current = document.title;
      setIsEditingTitle(false);
      setHasUnsavedChanges(false);
      setLastSaved(new Date(document.lastModifiedAt));
    }
  }, [document]);

  // Auto-save functionality
  const performAutoSave = useCallback(async () => {
    if (!documentId || !hasUnsavedChanges) return;

    const contentChanged = content !== lastContentRef.current;
    const titleChanged = title !== lastTitleRef.current;

    if (!contentChanged && !titleChanged) {
      setHasUnsavedChanges(false);
      return;
    }

    setIsAutoSaving(true);
    try {
      await updateDocument({
        documentId: documentId as Id<"documents">,
        title: titleChanged ? title : undefined,
        content: contentChanged ? content : undefined,
        changeDescription: "Auto-saved changes",
      });
      
      lastContentRef.current = content;
      lastTitleRef.current = title;
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Auto-save failed:", error);
      toast.error("Auto-save failed");
    } finally {
      setIsAutoSaving(false);
    }
  }, [documentId, content, title, hasUnsavedChanges, updateDocument]);

  // Set up auto-save timer
  useEffect(() => {
    if (hasUnsavedChanges) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave();
      }, 30000); // 30 seconds
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, performAutoSave]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  const plainTextContent = useMemo(() => {
    if (!content) return "";

    if (typeof window === "undefined") {
      return content.replace(/<[^>]+>/g, " ").trim();
    }

    const temp = document.createElement("div");
    temp.innerHTML = content;
    return temp.textContent || temp.innerText || "";
  }, [content]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setIsEditingTitle(true);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!documentId) return;

    try {
      await updateDocument({
        documentId: documentId as Id<"documents">,
        title,
        content,
        changeDescription: "Manual save",
      });
      
      lastContentRef.current = content;
      lastTitleRef.current = title;
      setIsEditingTitle(false);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      toast.success("Document saved successfully");
    } catch (error) {
      toast.error("Failed to save document");
      console.error("Save error:", error);
    }
  };

  const handleShare = async () => {
    if (!documentId) return;

    try {
      const shareableLink = await generateShareableLink({
        documentId: documentId as Id<"documents">,
      });
      
      const fullUrl = `${window.location.origin}/shared/${shareableLink}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Shareable link copied to clipboard");
    } catch (error) {
      toast.error("Failed to generate shareable link");
      console.error("Share error:", error);
    }
  };

  const handleRollback = async (version: number) => {
    if (!documentId) return;

    try {
      await rollbackToVersion({
        documentId: documentId as Id<"documents">,
        version,
      });
      toast.success(`Rolled back to version ${version}`);
      setShowVersions(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      toast.error("Failed to rollback document");
      console.error("Rollback error:", error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId || !newComment.trim()) return;

    try {
      await addComment({
        documentId: documentId as Id<"documents">,
        content: newComment,
      });
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      toast.error("Failed to add comment");
      console.error("Comment error:", error);
    }
  };

  const handleDelete = async () => {
    if (!documentId) return;
    
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteDocument({
        documentId: documentId as Id<"documents">,
      });
      onDocumentChange(null);
      toast.success("Document deleted");
    } catch (error) {
      toast.error("Failed to delete document");
      console.error("Delete error:", error);
    }
  };

  const exportToPDF = () => {
    if (!document) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${document.title}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
              h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
              .content { font-size: 16px; line-height: 1.75; color: #27272a; }
              .content h1, .content h2, .content h3, .content h4 { margin-top: 32px; }
              .content ul, .content ol { padding-left: 20px; }
              .content blockquote { border-left: 4px solid #d4d4d8; padding-left: 16px; color: #52525b; }
              .content pre { background: #111827; color: #f8fafc; padding: 16px; border-radius: 12px; }
              .content code { background: #f4f4f5; padding: 4px 6px; border-radius: 6px; }
            </style>
          </head>
          <body>
            <h1>${document.title}</h1>
            <div class="content">${content}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!documentId) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-[#fdfcf8]">
        <div className="text-center">
          <DocumentArrowDownIcon className="mx-auto mb-4 h-16 w-16 text-neutral-300" />
          <h3 className="text-lg font-semibold text-neutral-800">No document selected</h3>
          <p className="mt-2 text-sm text-neutral-500">Choose a page from the sidebar to begin editing.</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-[#fdfcf8]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fdfcf8]">
      <div className="border-b border-neutral-200/70 bg-[#f7f6f3]/80 px-10 py-5 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-neutral-400">
              <span>Document</span>
              <span className="text-neutral-300">•</span>
              <span>Version {document.version}</span>
            </div>
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="mt-3 w-full border-none bg-transparent text-3xl font-semibold text-neutral-900 outline-none focus:ring-1 focus:ring-neutral-400"
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
            ) : (
              <h1
                className="mt-3 cursor-text text-3xl font-semibold text-neutral-900 transition hover:text-neutral-700"
                onClick={() => setIsEditingTitle(true)}
              >
                {document.title}
              </h1>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="h-4 w-4 text-neutral-400" />
                {lastSaved ? `Last edited ${lastSaved.toLocaleString()}` : 'Never saved'}
              </span>
              <span className="text-neutral-300">•</span>
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="h-4 w-4 text-neutral-400" />
                {currentUserName ? `${currentUserName}` : 'Shared workspace'}
              </span>
              <span className="text-neutral-300">•</span>
              <span className="inline-flex items-center gap-1">
                <EyeIcon className="h-4 w-4 text-neutral-400" />
                {document.isPublic ? 'Public page' : 'Private page'}
              </span>
              {isAutoSaving && (
                <>
                  <span className="text-neutral-300">•</span>
                  <span className="text-neutral-500">Auto-saving…</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className={`inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 font-medium text-neutral-600 transition hover:bg-white hover:text-neutral-700 ${
                showVersions ? 'bg-white shadow-sm' : 'bg-transparent'
              }`}
            >
              <ClockIcon className="h-4 w-4" />
              Versions
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className={`inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 font-medium text-neutral-600 transition hover:bg-white hover:text-neutral-700 ${
                showComments ? 'bg-white shadow-sm' : 'bg-transparent'
              }`}
            >
              <ChatBubbleLeftIcon className="h-4 w-4" />
              Comments ({comments.length})
            </button>

            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className={`inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 font-medium transition hover:bg-white ${
                showAIChat
                  ? 'border-purple-300 bg-purple-50 text-purple-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-700'
              }`}
            >
              <SparklesIcon className="h-4 w-4" />
              AI Assistant
            </button>

            <button
              onClick={exportToPDF}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 font-medium text-neutral-600 transition hover:bg-white hover:text-neutral-700"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Export
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-1.5 font-medium text-neutral-100 transition hover:bg-neutral-700"
            >
              <ShareIcon className="h-4 w-4" />
              Share
            </button>

            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 font-medium text-red-600 transition hover:bg-red-100"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl px-10 pb-24 pt-12">
            <div className="mb-10 flex items-center gap-3 text-sm text-neutral-500">
              <UsersIcon className="h-5 w-5 text-neutral-400" />
              <span>Collaborate with your team and keep every update in one place.</span>
            </div>
            <TipTapEditor
              value={content}
              onChange={handleContentChange}
              placeholder="Type '/' for commands or start writing..."
            />
          </div>
        </div>

        {showVersions && (
          <div className="flex w-80 flex-col border-l border-neutral-200 bg-[#f7f6f3]">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-700">Document versions</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {versions.map((version) => (
                <div key={version._id} className="border-b border-neutral-200 px-4 py-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-700">Version {version.version}</span>
                    {version.version !== document.version && (
                      <button
                        onClick={() => handleRollback(version.version)}
                        className="text-xs font-medium text-neutral-500 transition hover:text-neutral-800"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {new Date(version.createdAt).toLocaleString()}
                  </p>
                  {version.changeDescription && (
                    <p className="mt-2 text-xs text-neutral-600">{version.changeDescription}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showComments && (
          <div className="flex w-80 flex-col border-l border-neutral-200 bg-[#f7f6f3]">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-700">Comments</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment._id} className="border-b border-neutral-200 px-4 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-neutral-100">
                      {comment.author?.name?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-700">
                        {comment.author?.name || 'Unknown user'}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-700">{comment.content}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="border-t border-neutral-200 px-4 py-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Leave a note..."
                className="w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:ring-0"
                rows={3}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="mt-3 w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                Add comment
              </button>
            </form>
          </div>
        )}

        <AIChatSidebar
          isOpen={showAIChat}
          onClose={() => setShowAIChat(false)}
          documentId={documentId}
          documentContent={plainTextContent}
        />
      </div>

      {hasUnsavedChanges && (
        <div className="flex items-center justify-between border-t border-neutral-200 bg-[#f7f6f3]/90 px-10 py-3 text-sm text-neutral-600">
          <div className="flex items-center gap-2">
            <span>Unsaved changes</span>
            {isAutoSaving && <span className="text-neutral-500">Auto-saving in progress…</span>}
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700"
          >
            <CheckIcon className="h-4 w-4" />
            Save now
          </button>
        </div>
      )}
    </div>
  );
}

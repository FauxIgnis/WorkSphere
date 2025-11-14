import { useState, useEffect, useRef, useCallback } from "react";
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

interface DocumentEditorProps {
  documentId: string | null;
  onDocumentChange: (documentId: string | null) => void;
}

export function DocumentEditor({ documentId, onDocumentChange }: DocumentEditorProps) {
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
      setContent(document.content);
      setTitle(document.title);
      lastContentRef.current = document.content;
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
              .content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>${document.title}</h1>
            <div class="content">${document.content}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!documentId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <DocumentArrowDownIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Document Selected</h3>
          <p className="text-gray-600">Select a document from the sidebar to start editing</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isEditingTitle ? (
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
            ) : (
              <h1 
                className="text-2xl font-bold text-gray-900 cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                onClick={() => setIsEditingTitle(true)}
              >
                {document.title}
              </h1>
            )}
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <ClockIcon className="w-4 h-4 mr-1" />
              {lastSaved ? `Last saved ${lastSaved.toLocaleString()}` : 'Never saved'}
              <span className="mx-2">•</span>
              Version {document.version}
              {isAutoSaving && (
                <>
                  <span className="mx-2">•</span>
                  <span className="text-blue-600">Auto-saving...</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
            >
              <ClockIcon className="w-4 h-4 mr-1" />
              Versions
            </button>
            
            <button
              onClick={() => setShowComments(!showComments)}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
            >
              <ChatBubbleLeftIcon className="w-4 h-4 mr-1" />
              Comments ({comments.length})
            </button>
            
            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className={`px-3 py-2 text-sm rounded-md hover:bg-purple-200 flex items-center transition-colors ${
                showAIChat 
                  ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <SparklesIcon className="w-4 h-4 mr-1" />
              AI Assistant
            </button>
            
            <button
              onClick={exportToPDF}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
              Export PDF
            </button>
            
            <button
              onClick={handleShare}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <ShareIcon className="w-4 h-4 mr-1" />
              Share
            </button>

            <button
              onClick={handleDelete}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full resize-none border-none outline-none text-gray-900 leading-relaxed text-base"
              placeholder="Start writing your document..."
              style={{ fontFamily: 'Georgia, serif' }}
            />
          </div>
          
          {hasUnsavedChanges && (
            <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm text-gray-600">Unsaved changes</span>
                  {isAutoSaving && (
                    <span className="ml-2 text-sm text-blue-600">Auto-saving in progress...</span>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                >
                  <CheckIcon className="w-4 h-4 mr-1" />
                  Save Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Versions Panel */}
        {showVersions && (
          <div className="w-80 border-l border-gray-200 bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Document Versions</h3>
            </div>
            <div className="overflow-y-auto max-h-96">
              {versions.map((version) => (
                <div key={version._id} className="p-4 border-b border-gray-200 hover:bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Version {version.version}</span>
                    {version.version !== document.version && (
                      <button
                        onClick={() => handleRollback(version.version)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-1">
                    {new Date(version.createdAt).toLocaleString()}
                  </p>
                  {version.changeDescription && (
                    <p className="text-xs text-gray-500">{version.changeDescription}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments Panel */}
        {showComments && (
          <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Comments</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment._id} className="p-4 border-b border-gray-200">
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {comment.author?.name?.[0] || 'U'}
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {comment.author?.name || 'Unknown User'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleAddComment} className="p-4 border-t border-gray-200">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="mt-2 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Comment
              </button>
            </form>
          </div>
        )}

        {/* AI Chat Sidebar */}
        <AIChatSidebar 
          isOpen={showAIChat} 
          onClose={() => setShowAIChat(false)}
          documentId={documentId}
          documentContent={content}
        />
      </div>
    </div>
  );
}

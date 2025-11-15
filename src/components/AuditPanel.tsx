import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { 
  ClipboardDocumentListIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  ShareIcon,
  ChatBubbleLeftIcon
} from "@heroicons/react/24/outline";

interface AuditPanelProps {
  documentId: string | null;
}

export function AuditPanel({ documentId }: AuditPanelProps) {
  const documentAuditLog = useQuery(
    api.audit.getDocumentAuditLog,
    documentId ? { documentId: documentId as Id<"documents"> } : "skip"
  ) || [];

  const userAuditLog = useQuery(api.audit.getUserAuditLog, {}) || [];

  const getActionIcon = (action: string) => {
    switch (action) {
      case "view": return <EyeIcon className="w-4 h-4" />;
      case "edit": return <PencilIcon className="w-4 h-4" />;
      case "create": return <PlusIcon className="w-4 h-4" />;
      case "delete": return <TrashIcon className="w-4 h-4" />;
      case "share": return <ShareIcon className="w-4 h-4" />;
      case "comment": return <ChatBubbleLeftIcon className="w-4 h-4" />;
      default: return <ClipboardDocumentListIcon className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "view": return "text-blue-600 bg-blue-50";
      case "edit": return "text-green-600 bg-green-50";
      case "create": return "text-purple-600 bg-purple-50";
      case "delete": return "text-red-600 bg-red-50";
      case "share": return "text-orange-600 bg-orange-50";
      case "comment": return "text-indigo-600 bg-indigo-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const displayLogs = documentId ? documentAuditLog : userAuditLog;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fdfcf8]">
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <div className="rounded-3xl border border-neutral-200/70 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-neutral-400">Audit Trail</p>
              <h2 className="mt-2 text-2xl font-semibold text-neutral-900">
                {documentId ? "Document Audit Log" : "My Activity Log"}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {documentId
                  ? "Track every action taken on this document with full visibility."
                  : "Review your recent activity across cases, documents, and collaboration."
                }
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-sm">
            <div className="h-full overflow-y-auto px-6 py-6">
              {displayLogs.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-[#f7f6f3]/60 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                    <ClipboardDocumentListIcon className="h-7 w-7 text-neutral-400" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-neutral-900">No activity yet</h3>
                  <p className="mt-2 max-w-md text-sm text-neutral-500">
                    {documentId
                      ? "As collaborators review or edit this document, their actions will be recorded here."
                      : "Your activity across documents and cases will surface here once actions are recorded."
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayLogs.map((log) => (
                    <div
                      key={log._id}
                      className="rounded-2xl border border-neutral-200/80 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                        </div>

                        <div className="flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-neutral-900">
                                {(log as any).user?.name || 'Unknown User'} {log.action}ed {documentId ? 'this document' : ((log as any).document?.title || 'a document')}
                              </p>
                              {log.details && (
                                <p className="text-sm text-neutral-500">{log.details}</p>
                              )}
                            </div>
                            <span className="text-xs text-neutral-400">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>

                          {!documentId && (log as any).document && (
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-neutral-400">
                              Document · {(log as any).document.title}
                            </p>
                          )}
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

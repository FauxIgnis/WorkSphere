import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  LockClosedIcon,
  GlobeAltIcon,
  BellIcon
} from "@heroicons/react/24/outline";
import { NotificationCenter } from "./NotificationCenter";
import { SubscriptionModal } from "./SubscriptionModal";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeView: 'editor' | 'chat' | 'tasks' | 'calendar' | 'audit' | 'cases';
  onViewChange: (view: 'editor' | 'chat' | 'tasks' | 'calendar' | 'audit' | 'cases') => void;
  selectedDocumentId: string | null;
  onDocumentSelect: (documentId: string | null) => void;
  selectedCaseId: string | null;
  onCaseSelect: (caseId: string | null) => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  activeView,
  onViewChange,
  selectedDocumentId,
  onDocumentSelect,
  selectedCaseId,
  onCaseSelect,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocIsPublic, setNewDocIsPublic] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const documents = useQuery(api.documents.listUserDocuments) || [];
  const searchResults = useQuery(
    api.documents.searchDocuments,
    searchQuery.length > 2 ? { query: searchQuery } : "skip"
  ) || [];
  const unreadCount = useQuery(api.notifications.getUnreadCount) || 0;
  const subscription = useQuery(api.subscriptions.getUserSubscription);
  const usageCheck = useQuery(api.subscriptions.checkUsageLimit, { feature: "documentsCreated" });

  const createDocument = useMutation(api.documents.createDocument);
  const incrementUsage = useMutation(api.subscriptions.incrementUsage);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    // Check usage limits for free users
    if (usageCheck && !usageCheck.allowed) {
      setShowSubscriptionModal(true);
      return;
    }

    try {
      const docId = await createDocument({
        title: newDocTitle,
        content: "",
        isPublic: newDocIsPublic,
      });
      
      // Increment usage for free users
      if (subscription?.plan === "free") {
        await incrementUsage({ feature: "documentsCreated" });
      }
      
      onDocumentSelect(docId);
      setNewDocTitle("");
      setNewDocIsPublic(false);
      setShowCreateForm(false);
      onViewChange('editor');
    } catch (error) {
      console.error("Failed to create document:", error);
    }
  };

  const displayedDocuments = searchQuery.length > 2 ? searchResults : documents;

  const navigationItems = [
    { id: 'editor', label: 'Editor', icon: DocumentTextIcon },
    { id: 'cases', label: 'Cases', icon: FolderIcon },
    { id: 'chat', label: 'Chat', icon: ChatBubbleLeftRightIcon },
    { id: 'tasks', label: 'Tasks', icon: CheckCircleIcon },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'audit', label: 'Audit Log', icon: ClipboardDocumentListIcon },
  ] as const;

  if (collapsed) {
    return (
      <div className="flex w-16 flex-col border-r border-neutral-200 bg-[#f7f6f3]">
        <button
          onClick={onToggleCollapse}
          className="flex h-12 items-center justify-center border-b border-neutral-200 text-neutral-500 transition hover:bg-neutral-100"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>

        <nav className="flex-1 py-4">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`relative flex h-12 w-full items-center justify-center transition ${
                activeView === item.id
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-100'
              }`}
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
              {activeView === item.id && (
                <span className="absolute inset-y-0 left-0 w-1 rounded-tr rounded-br bg-neutral-900" />
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-neutral-200 p-2">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative flex h-10 w-full items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100"
            title="Notifications"
          >
            <BellIcon className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-80 flex-col border-r border-neutral-200 bg-[#f7f6f3]">
        <div className="border-b border-neutral-200 px-5 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-[0.3em] text-neutral-400">Workspace</span>
              <p className="mt-1 text-sm font-medium text-neutral-700">Kodex Dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifications(true)}
                className="relative rounded-md border border-neutral-200 p-1.5 text-neutral-500 transition hover:bg-white"
                title="Notifications"
              >
                <BellIcon className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {subscription && (
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-wide ${
                    subscription.plan === 'pro'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {subscription.plan === 'pro' ? 'Pro' : 'Free'}
                  </span>
                  {subscription.plan === 'free' && (
                    <button
                      onClick={() => setShowSubscriptionModal(true)}
                      className="text-xs font-medium text-neutral-500 transition hover:text-neutral-900"
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={onToggleCollapse}
                className="rounded-md border border-neutral-200 p-1.5 text-neutral-500 transition hover:bg-white"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  activeView === item.id
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="border-b border-neutral-200 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-700">Documents</h3>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="rounded-md border border-neutral-200 p-1.5 text-neutral-500 transition hover:bg-white"
                title="Create new document"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateDocument} className="mb-4 rounded-lg border border-neutral-200 bg-white p-3">
                <input
                  type="text"
                  placeholder="Document title"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="mb-2 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 outline-none transition focus:border-neutral-400 focus:ring-0"
                  autoFocus
                />
                <label className="mb-3 flex items-center gap-2 text-xs text-neutral-500">
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
                  <p className="mt-3 text-xs text-red-500">
                    {usageCheck.reason}. Upgrade to Pro for unlimited documents.
                  </p>
                )}
              </form>
            )}

            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-300" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-neutral-200 bg-white pl-9 pr-3 py-2 text-sm text-neutral-600 outline-none transition focus:border-neutral-400 focus:ring-0"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1 px-3 py-4">
              {displayedDocuments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-200 bg-white/60 px-4 py-10 text-center text-neutral-400">
                  <FolderIcon className="mx-auto mb-3 h-6 w-6" />
                  <p className="text-sm">
                    {searchQuery.length > 2 ? 'No documents found' : 'Create your first document to get started'}
                  </p>
                </div>
              ) : (
                displayedDocuments.filter(Boolean).map((doc) => {
                  if (!doc) return null;
                  const isActive = selectedDocumentId === doc._id;
                  return (
                    <button
                      key={doc._id}
                      onClick={() => {
                        onDocumentSelect(doc._id);
                        onViewChange('editor');
                      }}
                      className={`flex w-full items-start justify-between rounded-lg border px-3 py-3 text-left transition ${
                        isActive
                          ? 'border-neutral-400 bg-white shadow-sm'
                          : 'border-transparent bg-transparent hover:border-neutral-200 hover:bg-white'
                      }`}
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
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        feature={usageCheck && !usageCheck.allowed ? "document creation" : undefined}
        currentUsage={usageCheck?.currentUsage}
        limit={usageCheck?.limit}
      />
    </>
  );
}

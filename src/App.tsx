import { useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Sidebar } from "./components/Sidebar";
import { DocumentEditor } from "./components/DocumentEditor";
import { GoalsPanel } from "./components/GoalsPanel";
import { HubPanel } from "./components/HubPanel";
import { WorkspaceChat } from "./components/WorkspaceChat";
import { SharedDocument } from "./SharedDocument";
import { Toaster } from "sonner";
import { BellIcon } from "@heroicons/react/24/outline";
import { NotificationCenter } from "./components/NotificationCenter";
import { SubscriptionModal } from "./components/SubscriptionModal";

type WorkspaceView = 'editor' | 'goals' | 'hub' | 'chat';

function MainApp() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>('editor');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const user = useQuery(api.auth.loggedInUser);
  const unreadCount = useQuery(api.notifications.getUnreadCount) || 0;
  const usageCheck = useQuery(api.subscriptions.checkUsageLimit, { feature: "documentsCreated" });

  const viewLabels: Record<WorkspaceView, string> = {
    editor: 'Documents',
    hub: 'Hub',
    goals: 'Goals',
    chat: 'WS Chat',
  };

  const renderMainContent = () => {
    switch (activeView) {
      case 'editor':
        return (
          <DocumentEditor
            documentId={selectedDocumentId}
            onDocumentChange={setSelectedDocumentId}
            currentUserName={user?.name || user?.email || undefined}
          />
        );
      case 'hub':
        return (
          <HubPanel
            selectedCaseId={selectedCaseId}
            onCaseSelect={setSelectedCaseId}
          />
        );
      case 'goals':
        return <GoalsPanel documentId={selectedDocumentId} />;
      case 'chat':
        return <WorkspaceChat />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#f7f6f3] text-neutral-900">
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] p-6">
          <div className="max-w-md w-full">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
                <span>Welcome</span>
              </div>
              <h1 className="mt-6 text-4xl font-semibold text-neutral-900">Sign in to continue</h1>
              <p className="mt-3 text-sm text-neutral-500">
                Unlock collaborative drafting, AI research, and case automation in one calm workspace.
              </p>
            </div>
            <div className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-sm">
              <SignInForm />
            </div>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            activeView={activeView}
            onViewChange={setActiveView}
            selectedCaseId={selectedCaseId}
            onCaseSelect={setSelectedCaseId}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="flex h-14 items-center justify-between border-b border-neutral-200/70 bg-[#f7f6f3]/90 px-6 backdrop-blur">
              <div className="flex flex-col">
                <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500">
                  <span className="font-medium text-neutral-700">Home</span>
                  <span className="text-neutral-300">/</span>
                  <span>{viewLabels[activeView]}</span>
                  {activeView === 'editor' && selectedDocumentId && (
                    <>
                      <span className="text-neutral-300">/</span>
                      <span className="truncate max-w-[240px] text-neutral-500" title="Active document">
                        Document
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-500">
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative rounded-full border border-neutral-200 p-2 text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-800"
                  aria-label="Notifications"
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:text-neutral-900"
                >
                  Upgrade
                </button>
                <SignOutButton />
              </div>
            </header>
            <div className="flex-1 overflow-hidden">
              {renderMainContent()}
            </div>
          </div>
        </div>
      </Authenticated>
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
    </div>
  );
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/shared/:shareableLink" element={<SharedDocument />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </Router>
  );
}

export default App;

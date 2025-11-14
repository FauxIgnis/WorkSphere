import { useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Sidebar } from "./components/Sidebar";
import { DocumentEditor } from "./components/DocumentEditor";
import { ChatPanel } from "./components/ChatPanel";
import { TaskPanel } from "./components/TaskPanel";
import { CalendarPanel } from "./components/CalendarPanel";
import { AuditPanel } from "./components/AuditPanel";
import { CasePanel } from "./components/CasePanel";
import { SharedDocument } from "./SharedDocument";
import { Toaster } from "sonner";

type WorkspaceView = 'editor' | 'chat' | 'tasks' | 'calendar' | 'audit' | 'cases';

function MainApp() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>('editor');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const user = useQuery(api.auth.loggedInUser);

  const viewLabels: Record<WorkspaceView, string> = {
    editor: 'Documents',
    cases: 'Cases',
    chat: 'Discussions',
    tasks: 'Tasks',
    calendar: 'Calendar',
    audit: 'Audit Log',
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
      case 'cases':
        return (
          <CasePanel
            selectedCaseId={selectedCaseId}
            onCaseSelect={setSelectedCaseId}
          />
        );
      case 'chat':
        return <ChatPanel documentId={selectedDocumentId} />;
      case 'tasks':
        return <TaskPanel documentId={selectedDocumentId} />;
      case 'calendar':
        return <CalendarPanel />;
      case 'audit':
        return <AuditPanel documentId={selectedDocumentId} />;
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
              <div className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                Kodex Workspace
              </div>
              <h1 className="mt-6 text-4xl font-semibold text-neutral-900">Welcome back</h1>
              <p className="mt-3 text-sm text-neutral-500">
                Sign in to access your collaborative legal workspace with AI assistance.
              </p>
            </div>
            <SignInForm />
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
            selectedDocumentId={selectedDocumentId}
            onDocumentSelect={setSelectedDocumentId}
            selectedCaseId={selectedCaseId}
            onCaseSelect={setSelectedCaseId}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="flex h-14 items-center justify-between border-b border-neutral-200/70 bg-[#f7f6f3]/90 px-6 backdrop-blur">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-[0.3em] text-neutral-400">Kodex Workspace</span>
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
                {user && (
                  <span className="hidden sm:inline-flex max-w-[180px] truncate">
                    {user.name || user.email}
                  </span>
                )}
                <SignOutButton />
              </div>
            </header>
            <div className="flex-1 overflow-hidden">
              {renderMainContent()}
            </div>
          </div>
        </div>
      </Authenticated>
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

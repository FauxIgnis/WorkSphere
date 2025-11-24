import { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeView: "editor" | "goals" | "hub" | "chat";
  onViewChange: (view: "editor" | "goals" | "hub" | "chat") => void;
  selectedCaseId: string | null;
  onCaseSelect: (caseId: string | null) => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  activeView,
  onViewChange,
  selectedCaseId,
  onCaseSelect,
}: SidebarProps) {

  const navigationItems = [
    { id: "editor", label: "Editor", icon: DocumentTextIcon },
    { id: "hub", label: "Hub", icon: FolderIcon },
    { id: "goals", label: "Goals", icon: CheckCircleIcon },
    { id: "chat", label: "WS Chat", icon: SparklesIcon },
  ] as const;

  if (collapsed) {
    return (
      <div className="flex w-16 flex-col border-r border-neutral-200 bg-white">
        <button
          onClick={onToggleCollapse}
          className="flex h-12 items-center justify-center border-b border-neutral-200 text-neutral-500 transition hover:bg-neutral-50"
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
                  ? 'bg-gray-100 text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-50'
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

        <div className="border-t border-neutral-200 p-2" />
      </div>
    );
  }

  return (
    <div className="flex w-80 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-4">
        <div className="mb-4 flex items-center justify-end">
          <button
            onClick={onToggleCollapse}
            className="rounded-md border border-neutral-200 p-1.5 text-neutral-500 transition hover:bg-neutral-50"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
        </div>

        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                activeView === item.id
                  ? 'bg-gray-100 text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1" />
    </div>
  );
}

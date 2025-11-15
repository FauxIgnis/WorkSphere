import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  XMarkIcon,
  CheckIcon,
  SparklesIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  currentUsage?: number;
  limit?: number;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  feature,
  currentUsage,
  limit,
}: SubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const subscription = useQuery(api.subscriptions.getUserSubscription);
  const usage = useQuery(api.subscriptions.getUserUsage, {});

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsLoading(true);
    alert("Stripe integration would be implemented here. For demo purposes, this would redirect to payment.");
    setIsLoading(false);
  };

  const freeFeatures = [
    "10 AI chatbot questions per month",
    "3 tasks",
    "5 document creations",
    "1 PDF export",
    "3 calendar events",
    "5 file uploads",
    "Basic document editing",
    "Public document sharing",
  ];

  const proFeatures = [
    "Unlimited AI chatbot questions",
    "Unlimited tasks",
    "Unlimited document creations",
    "Unlimited PDF exports",
    "Unlimited calendar events",
    "Unlimited file uploads",
    "Advanced collaboration features",
    "Real-time editing with presence",
    "Advanced commenting & suggestions",
    "Audit log access",
    "Priority support",
    "Case management (30 docs, 50MB)",
    "Workspace invitations & roles",
  ];

  const planLabel = subscription?.plan === "pro" ? "Pro" : "Free";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-neutral-200/70 bg-[#fdfcf8] shadow-2xl">
        <div className="flex items-start justify-between border-b border-neutral-200/70 bg-white/70 px-8 py-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] text-neutral-400">
              <SparklesIcon className="h-4 w-4 text-indigo-500" />
              Upgrade
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-neutral-900">Upgrade to Pro</h2>
            {feature ? (
              <p className="mt-2 text-sm text-neutral-500">
                You've reached your free tier limit for {feature} ({currentUsage}/{limit}). Unlock more usage by upgrading.
              </p>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">
                Move beyond the basics with unlimited AI research, collaboration tools, and premium case management features.
              </p>
            )}
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
              Current Plan · {planLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-700"
            aria-label="Close subscription modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {usage && (
          <div className="border-b border-neutral-200/70 bg-[#f7f6f3]/60 px-8 py-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">Your Usage Snapshot</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {[{
                label: "AI Questions",
                value: `${usage.aiQuestions}/10`,
              }, {
                label: "Tasks",
                value: `${usage.tasksCreated}/3`,
              }, {
                label: "Documents",
                value: `${usage.documentsCreated}/5`,
              }, {
                label: "PDF Exports",
                value: `${usage.pdfExports}/1`,
              }, {
                label: "Calendar Events",
                value: `${usage.calendarEvents}/3`,
              }, {
                label: "File Uploads",
                value: `${usage.fileUploads}/5`,
              }].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-8 py-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-neutral-200 bg-white/80 p-6 shadow-sm">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">Free</p>
                <h3 className="mt-2 text-3xl font-semibold text-neutral-900">$0</h3>
                <p className="mt-1 text-sm text-neutral-500">per month</p>
              </div>
              <ul className="mt-6 space-y-3">
                {freeFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-neutral-600">
                    <CheckIcon className="mt-0.5 h-5 w-5 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled
                className="mt-6 w-full rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-400"
              >
                Current Plan
              </button>
            </div>

            <div className="relative rounded-3xl border-2 border-neutral-900 bg-white p-6 shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-neutral-900 bg-neutral-900 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-white">
                Pro
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">Professional</p>
                <h3 className="mt-2 text-3xl font-semibold text-neutral-900">$30</h3>
                <p className="mt-1 text-sm text-neutral-500">per month</p>
              </div>
              <ul className="mt-6 space-y-3">
                {proFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-neutral-600">
                    <CheckIcon className="mt-0.5 h-5 w-5 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? (
                  <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-neutral-100 border-t-transparent" />
                ) : (
                  <>
                    <CreditCardIcon className="h-5 w-5" />
                    Upgrade to Pro
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

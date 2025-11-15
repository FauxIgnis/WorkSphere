import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface ChatPanelProps {
  documentId: string | null;
}

export function ChatPanel({ documentId }: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messages =
    useQuery(
      api.chat.getChatMessages,
      documentId ? { documentId: documentId as Id<"documents"> } : {}
    ) || [];

  const sendMessage = useMutation(api.chat.sendMessage);
  const addReaction = useMutation(api.chat.addReaction);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;

    try {
      let fileId = null;

      if (selectedFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        if (!result.ok) {
          throw new Error("File upload failed");
        }

        const { storageId } = await result.json();

        fileId = await saveFile({
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          storageId,
          documentId: documentId as Id<"documents"> | undefined,
        });
      }

      const messageContent = selectedFile
        ? `${message.trim() || "Shared a file"} [File: ${selectedFile.name}]`
        : message;

      await sendMessage({
        content: messageContent,
        documentId: documentId as Id<"documents"> | undefined,
      });

      setMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("Failed to send message");
      console.error("Send message error:", error);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await addReaction({
        messageId: messageId as Id<"chatMessages">,
        emoji,
      });
    } catch (error) {
      toast.error("Failed to add reaction");
      console.error("Reaction error:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const commonReactions = ["👍", "👎", "❤️", "😂", "😮", "😢", "😡"];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fdfcf8]">
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <div className="rounded-3xl border border-neutral-200/70 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.4em] text-neutral-400">
                  Conversations
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-neutral-900">
                  {documentId ? "Document Chat" : "Workspace Chat"}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {documentId
                    ? "Collaborate with your team about this document."
                    : "Discuss research, share insights, and work with the AI assistant."}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-neutral-500 shadow-sm">
                <SparklesIcon className="h-4 w-4 text-indigo-500" />
                AI Active
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-sm">
            <div className="flex-1 overflow-y-auto bg-white px-6 py-6">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-[#f7f6f3]/60 px-6 py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                    <SparklesIcon className="h-8 w-8 text-indigo-500" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-neutral-900">Start a conversation</h3>
                  <p className="mt-2 max-w-md text-sm text-neutral-500">
                    Ask legal questions, discuss documents, or collaborate with your team. Our AI assistant is ready to help with research and analysis.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg._id}
                      className="group flex max-w-3xl items-start gap-3"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${
                          msg.isAI ? "bg-neutral-900" : "bg-neutral-700"
                        }`}
                      >
                        {msg.isAI ? "🤖" : msg.author?.name?.[0] || "U"}
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-900">
                            {msg.isAI
                              ? "Legal AI Assistant"
                              : msg.author?.name || "Unknown User"}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div
                          className={`rounded-2xl border px-4 py-3 text-sm text-neutral-700 ${
                            msg.isAI
                              ? "border-indigo-100 bg-gradient-to-r from-indigo-50 via-blue-50 to-white"
                              : "border-neutral-200 bg-neutral-50"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="flex gap-1">
                              {Object.entries(
                                msg.reactions.reduce(
                                  (acc: Record<string, number>, reaction) => {
                                    acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                                    return acc;
                                  },
                                  {}
                                )
                              ).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg._id, emoji)}
                                  className="rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50"
                                >
                                  {emoji} {count}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {commonReactions.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg._id, emoji)}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
                                title={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-neutral-200/80 bg-[#f7f6f3]/60 px-6 py-4">
              {selectedFile && (
                <div className="mb-3 flex items-center justify-between rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-600">
                  <div className="flex items-center gap-2">
                    <PaperClipIcon className="h-4 w-4 text-neutral-500" />
                    <span className="max-w-[220px] truncate">{selectedFile.name}</span>
                    <span className="text-xs text-neutral-400">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-xs font-medium text-neutral-500 transition hover:text-neutral-800"
                  >
                    Remove
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSendMessage}
                className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4"
              >
                <div className="flex-1">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask a legal question or start a discussion..."
                    className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 md:flex-col md:items-stretch md:gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-800"
                    title="Attach file"
                  >
                    <PaperClipIcon className="h-5 w-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={!message.trim() && !selectedFile}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </div>
              </form>

              <p className="mt-3 text-xs text-neutral-500">
                Press Enter to send, Shift+Enter for a new line. AI responses are for informational purposes only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

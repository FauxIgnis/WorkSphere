import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export function WorkspaceChat() {
  const chats = useQuery(api.aiChats.listChats) ?? [];
  const [selectedChatId, setSelectedChatId] = useState<Id<"aiChats"> | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createChat = useMutation(api.aiChats.createChat);
  const sendMessage = useAction(api.aiChats.sendMessage);

  const messages =
    useQuery(
      api.aiChats.getMessages,
      selectedChatId ? { chatId: selectedChatId } : "skip",
    ) ?? [];

  const selectedChat = useMemo(
    () => chats.find((chat) => chat && chat._id === selectedChatId),
    [chats, selectedChatId],
  );

  const filteredChats = useMemo(() => {
    if (!searchTerm.trim()) {
      return chats;
    }
    return chats.filter(
      (chat) =>
        chat &&
        chat.title.toLowerCase().includes(searchTerm.trim().toLowerCase()),
    );
  }, [chats, searchTerm]);

  useEffect(() => {
    if (!chats?.length) {
      setSelectedChatId(null);
      return;
    }

    if (selectedChatId) {
      const stillExists = chats.some((chat) => chat?._id === selectedChatId);
      if (!stillExists) {
        setSelectedChatId(chats[0]?._id ?? null);
      }
    } else {
      setSelectedChatId(chats[0]?._id ?? null);
    }
  }, [chats, selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    setMessage("");
  }, [selectedChatId]);

  const handleCreateChat = async () => {
    try {
      const chatId = await createChat({});
      setSelectedChatId(chatId);
    } catch (error) {
      console.error("Failed to create chat", error);
      toast.error("Unable to start a new chat right now.");
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChatId || !message.trim() || isSending) {
      return;
    }

    try {
      setIsSending(true);
      await sendMessage({ chatId: selectedChatId, content: message.trim() });
      setMessage("");
    } catch (error) {
      console.error("Failed to send chat message", error);
      toast.error("AI assistant is unavailable. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full bg-[#f7f6f3] text-neutral-900">
      <div className="flex w-80 flex-col border-r border-neutral-200 bg-white/80">
        <div className="border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-400">
                Workspace
              </p>
              <p className="mt-1 text-sm font-semibold text-neutral-800">
                WS Chat
              </p>
            </div>
            <button
              onClick={handleCreateChat}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              <SparklesIcon className="h-3.5 w-3.5" />
              New Chat
            </button>
          </div>
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 outline-none transition focus:border-neutral-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {filteredChats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center">
              <ChatBubbleLeftRightIcon className="mx-auto mb-3 h-6 w-6 text-neutral-400" />
              <p className="text-sm font-medium text-neutral-700">
                {searchTerm ? "No chats match that search" : "No chats yet"}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Start a conversation to see it here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredChats.map((chat) => {
                if (!chat) return null;
                const isActive = chat._id === selectedChatId;

                return (
                  <button
                    key={chat._id}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                        : "border-neutral-200 bg-white/70 text-neutral-700 hover:border-neutral-300"
                    }`}
                    onClick={() => setSelectedChatId(chat._id)}
                  >
                    <p className="text-sm font-semibold truncate">
                      {chat.title || "Untitled chat"}
                    </p>
                    <p className={`mt-1 text-xs ${
                      isActive ? "text-neutral-300" : "text-neutral-500"
                    }`}>
                      {chat.lastMessagePreview || "No messages yet"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {selectedChat ? (
          <>
            <div className="flex items-center justify-between border-b border-neutral-200 bg-white/70 px-8 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">
                  Conversation
                </p>
                <h2 className="mt-1 text-xl font-semibold text-neutral-900">
                  {selectedChat.title || "Untitled chat"}
                </h2>
              </div>
              <button
                onClick={handleCreateChat}
                className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition hover:border-neutral-400"
              >
                Start new chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-neutral-500">
                  <SparklesIcon className="h-10 w-10 text-neutral-300" />
                  <p className="mt-4 text-lg font-medium text-neutral-800">
                    This chat is empty.
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-neutral-500">
                    Ask a question to kick off the conversation or start a new chat.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-2xl rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                          msg.role === "user"
                            ? "bg-neutral-900 text-white"
                            : "bg-white text-neutral-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p
                          className={`mt-2 text-[11px] ${
                            msg.role === "user"
                              ? "text-neutral-300"
                              : "text-neutral-500"
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-white px-4 py-2 text-xs text-neutral-500 shadow-sm">
                        AI is drafting a response...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-neutral-200 bg-white/90 px-8 py-5">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-end gap-3"
                >
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask a question about strategy, drafting, compliance, or research..."
                    className="h-24 flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-neutral-400"
                    disabled={isSending}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!message.trim() || isSending}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white transition hover:bg-neutral-800 disabled:opacity-40"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </form>
                <p className="mt-2 text-xs text-neutral-500">
                  Press Enter to send. Shift + Enter adds a new line.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-neutral-500">
            <SparklesIcon className="h-12 w-12 text-neutral-300" />
            <p className="mt-4 text-lg font-semibold text-neutral-800">
              Create your first chat
            </p>
            <p className="mt-2 max-w-sm text-sm">
              Launch a WS Chat thread from the sidebar to brainstorm briefs,
              summarize documents, or get legal research inspiration.
            </p>
            <button
              onClick={handleCreateChat}
              className="mt-6 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400"
            >
              Start chatting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

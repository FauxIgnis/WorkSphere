import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { 
  SparklesIcon,
  XMarkIcon,
  PaperAirplaneIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface AIChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string | null;
  documentContent?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: number;
}

export function AIChatSidebar({ isOpen, onClose, documentId, documentContent }: AIChatSidebarProps) {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const generateAIResponse = useAction(api.chat.generateAIResponse);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: Date.now()
    };

    setChatHistory(prev => [...prev, userMessage]);
    const currentMessage = message;
    setMessage("");
    setIsLoading(true);

    try {
      // Prepare context for AI
      let contextualMessage = currentMessage;
      if (documentContent && documentContent.trim()) {
        contextualMessage = `Document context: "${documentContent.substring(0, 500)}${documentContent.length > 500 ? '...' : ''}"\n\nUser question: ${currentMessage}`;
      }

      const aiResponse = await generateAIResponse({
        userMessage: contextualMessage,
        documentId: documentId as Id<"documents"> | undefined,
      });

      if (aiResponse) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: aiResponse,
          timestamp: Date.now()
        };
        setChatHistory(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error("AI response error:", error);
      toast.error("Failed to get AI response");
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I apologize, but I'm currently unable to provide a response. Please try again later.",
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setMessage(question);
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 border-l border-gray-200 bg-[#f7f6f3] flex flex-col transition-all duration-300 ease-in-out">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-[#f7f6f3]">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm">
              <SparklesIcon className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 font-sans">
                Legal AI Assistant
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-sans">
                Get instant legal insights and document analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-colors"
            aria-label="Close AI Assistant"
          >
            <XMarkIcon className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 min-h-0">
        {chatHistory.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-xl border border-gray-200 bg-white flex items-center justify-center mx-auto mb-5 shadow-sm">
              <SparklesIcon className="w-6 h-6 text-slate-500" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2 font-sans">
              Welcome to Legal AI Assistant
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-sans">
              Ask questions about legal concepts, document analysis, compliance requirements, or get help with your legal research.
            </p>
            <div className="mt-8 space-y-2 text-left">
              <p className="text-xs font-medium text-slate-600 font-sans">Try asking:</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleSuggestedQuestion("What are the key elements of a valid contract?")}
                  className="block w-full text-left text-xs text-slate-600 hover:text-slate-900 px-3 py-2 bg-white border border-gray-200 rounded-lg transition-colors font-sans"
                >
                  "What are the key elements of a valid contract?"
                </button>
                <button
                  onClick={() => handleSuggestedQuestion("Help me review this document for compliance issues")}
                  className="block w-full text-left text-xs text-slate-600 hover:text-slate-900 px-3 py-2 bg-white border border-gray-200 rounded-lg transition-colors font-sans"
                >
                  "Help me review this document for compliance issues"
                </button>
                <button
                  onClick={() => handleSuggestedQuestion("What are common legal risks in business agreements?")}
                  className="block w-full text-left text-xs text-slate-600 hover:text-slate-900 px-3 py-2 bg-white border border-gray-200 rounded-lg transition-colors font-sans"
                >
                  "What are common legal risks in business agreements?"
                </button>
                {documentContent && (
                  <button
                    onClick={() => handleSuggestedQuestion("Analyze this document for potential legal issues")}
                    className="block w-full text-left text-xs text-slate-600 hover:text-slate-900 px-3 py-2 bg-white border border-gray-200 rounded-lg transition-colors font-sans"
                  >
                    "Analyze this document for potential legal issues"
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-sm px-4 py-3 rounded-2xl shadow-sm ${
                    msg.type === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-gray-200 text-slate-800'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.content}
                  </p>
                  <p className={`text-[11px] mt-2 font-sans ${
                    msg.type === 'user' ? 'text-slate-300' : 'text-slate-400'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 text-slate-700 shadow-sm px-4 py-3 rounded-2xl max-w-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-slate-600 font-sans">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <div className="px-6 py-5 border-t border-gray-200 bg-[#f7f6f3]">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about legal concepts, document analysis, compliance..."
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-sans leading-relaxed shadow-sm"
              rows={2}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="p-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-3 font-sans leading-relaxed">
          Press Enter to send, Shift+Enter for new line. AI responses are for informational purposes only.
        </p>
      </div>
    </div>
  );
}

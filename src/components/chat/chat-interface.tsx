"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Paperclip,
  Search,
  Loader2,
  X,
  Bot,
  User,
  FileCode,
  Image as ImageIcon,
  File,
  ChevronDown,
  Sparkles,
  Plus,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChatMessage, FileAttachment } from "@/types/chat";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChatSession,
  createChatSession,
  getChatSessions,
  getSessionMessages,
  saveMessage,
  updateSessionTitle,
} from "@/lib/chat-history";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const MAX_ATTACHMENT_SIZE_BYTES = 900 * 1024;

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

const WELCOME_MESSAGE = `# 👋 Welcome to ByteReaper!

I'm your AI developer assistant. I can help you with:

- 🔍 **Code Analysis** - Review your code for bugs, security issues, and improvements
- 📁 **File Analysis** - Upload code files and I'll analyze them
- 🌐 **Web Search** - Search for documentation, tutorials, or solutions
- 📊 **GitHub Analysis** - Analyze public repositories
- 💡 **Code Explanation** - Understand how code works
- 🐛 **Debugging** - Help identify and fix bugs

**Try these commands:**
- "Analyze this code: [paste code]"
- "Search for React hooks tutorial"
- "Analyze github.com/facebook/react"
- Or just upload a file and ask me to review it!

What would you like help with today?`;

function getWelcomeMessages(): ChatMessage[] {
  return [
    {
      id: "welcome",
      role: "assistant",
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    },
  ];
}

function formatSessionDate(date: Date): string {
  const now = new Date();
  const isSameDay = now.toDateString() === date.toDateString();

  if (isSameDay) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

// Available AI Models (must match server-side) - All FREE on OpenRouter
const AI_MODELS = {
  auto: { name: "Auto (Free Router)", description: "🎲 Auto-select", provider: "OpenRouter" },
  nemotron: { name: "Nemotron 3 Super 120B", description: "🚀 Powerful", provider: "NVIDIA" },
  minimax: { name: "MiniMax M2.5", description: "⚡ Fast", provider: "MiniMax" },
  "step-flash": { name: "Step 3.5 Flash", description: "🧠 Reasoning", provider: "StepFun" },
  trinity: { name: "Trinity Large 400B", description: "✨ Creative", provider: "Arcee AI" },
  "liquid-think": { name: "LFM 2.5 Thinking", description: "💭 Thinking", provider: "LiquidAI" },
  liquid: { name: "LFM 2.5 Instruct", description: "📝 Instruct", provider: "LiquidAI" },
} as const;

type ModelKey = keyof typeof AI_MODELS;

// File type detection
function getFileType(file: File): "code" | "image" | "text" | "other" {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const codeExts = [
    "js",
    "ts",
    "jsx",
    "tsx",
    "py",
    "java",
    "cpp",
    "c",
    "h",
    "css",
    "html",
    "json",
    "md",
    "yaml",
    "yml",
    "sql",
    "sh",
    "bash",
    "go",
    "rs",
    "rb",
    "php",
  ];
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg"];

  if (codeExts.includes(ext)) return "code";
  if (imageExts.includes(ext)) return "image";
  if (file.type.startsWith("text/")) return "text";
  return "other";
}

// File icon component
function FileIcon({ type }: { type: "code" | "image" | "text" | "other" }) {
  switch (type) {
    case "code":
      return <FileCode className="h-4 w-4" />;
    case "image":
      return <ImageIcon className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
}

// Model Selector Component
function ModelSelector({
  selectedModel,
  onSelect,
  disabled,
}: {
  selectedModel: ModelKey;
  onSelect: (model: ModelKey) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const model = AI_MODELS[selectedModel];

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="gap-2 min-w-[180px] justify-between"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs">{model.description}</span>
          <span className="font-medium">{model.name}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-lg shadow-lg z-20 py-1">
            {(Object.entries(AI_MODELS) as [ModelKey, (typeof AI_MODELS)[ModelKey]][]).map(([key, m]) => (
              <button
                key={key}
                onClick={() => {
                  onSelect(key);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between",
                  key === selectedModel && "bg-accent"
                )}
              >
                <div>
                  <div className="font-medium text-sm">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.provider}</div>
                </div>
                <span className="text-sm">{m.description}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ChatInterface() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(getWelcomeMessages());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelKey>("auto");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadSessions = useCallback(
    async (preferredSessionId?: string | null) => {
      if (!user) return;

      setIsHistoryLoading(true);

      try {
        let fetchedSessions = await getChatSessions(user.uid);

        if (fetchedSessions.length === 0) {
          const createdSessionId = await createChatSession(user.uid, "New Chat", selectedModel);
          fetchedSessions = await getChatSessions(user.uid);
          setSessions(fetchedSessions);
          setSessionId(createdSessionId);
          return;
        }

        setSessions(fetchedSessions);

        const nextSessionId =
          preferredSessionId && fetchedSessions.some((session) => session.id === preferredSessionId)
            ? preferredSessionId
            : sessionId && fetchedSessions.some((session) => session.id === sessionId)
              ? sessionId
              : fetchedSessions[0].id;

        if (nextSessionId !== sessionId) {
          setSessionId(nextSessionId);
        }
      } catch (error) {
        console.error("Failed to load chat sessions:", error);
        setChatError("Could not load chat history right now.");
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [user, selectedModel, sessionId]
  );

  useEffect(() => {
    if (!user) {
      setSessionId(null);
      setSessions([]);
      setMessages(getWelcomeMessages());
      return;
    }

    void loadSessions();
  }, [user, loadSessions]);

  // Load selected chat messages
  useEffect(() => {
    if (!sessionId) {
      setMessages(getWelcomeMessages());
      return;
    }

    let isMounted = true;
    setIsMessagesLoading(true);

    getSessionMessages(sessionId)
      .then((storedMessages) => {
        if (!isMounted) return;
        setMessages(storedMessages.length > 0 ? storedMessages : getWelcomeMessages());
      })
      .catch((error) => {
        console.error("Failed to load chat messages:", error);
        if (isMounted) {
          setMessages(getWelcomeMessages());
          setChatError("Could not load messages for this chat.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsMessagesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  // Prefill prompt from landing page if available
  useEffect(() => {
    if (!sessionId) return;

    const pendingPrompt = sessionStorage.getItem("bytereaper_landing_prompt");
    if (pendingPrompt) {
      setInput(pendingPrompt);
      sessionStorage.removeItem("bytereaper_landing_prompt");
    }
  }, [sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleCreateNewChat = useCallback(async () => {
    if (!user || isLoading) return;

    setChatError(null);

    try {
      const createdSessionId = await createChatSession(user.uid, "New Chat", selectedModel);
      setSessionId(createdSessionId);
      setMessages(getWelcomeMessages());
      await loadSessions(createdSessionId);
    } catch (error) {
      console.error("Failed to create new chat:", error);
      setChatError("Failed to create a new chat. Please try again.");
    }
  }, [user, isLoading, selectedModel, loadSessions]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    setChatError(null);
    const newAttachments: FileAttachment[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setChatError(
          `"${file.name}" is too large. Keep files under ${Math.round(
            MAX_ATTACHMENT_SIZE_BYTES / 1024
          )}KB for Firestore storage.`
        );
        continue;
      }

      const fileType = getFileType(file);
      let content: string | undefined;
      let preview: string | undefined;

      if (fileType === "code" || fileType === "text") {
        content = await file.text();
      } else {
        const dataUrl = await readFileAsDataUrl(file);
        content = dataUrl;
        if (fileType === "image") {
          preview = dataUrl;
        }
      }

      newAttachments.push({
        id: generateId(),
        name: file.name,
        type: file.type || `application/${file.name.split(".").pop()}`,
        size: file.size,
        content,
        preview,
      });
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  }, []);

  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        void handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload]
  );

  // Send message
  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading || !user) return;

    setChatError(null);

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        activeSessionId = await createChatSession(user.uid, "New Chat", selectedModel);
        setSessionId(activeSessionId);
        await loadSessions(activeSessionId);
      } catch (error) {
        console.error("Failed to initialize chat session:", error);
        setChatError("Could not create a chat session. Please try again.");
        return;
      }
    }

    if (!activeSessionId) {
      setChatError("Chat session is not ready yet.");
      return;
    }

    const historyForModel = messages.filter((message) => message.id !== "welcome").slice(-10);
    const isFirstRealMessage = historyForModel.length === 0;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    const assistantId = generateId();

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);
    setInput("");
    setAttachments([]);
    setIsLoading(true);

    let userMessagePersisted = false;

    try {
      // Use streaming API with model selection
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          attachments: userMessage.attachments,
          history: historyForModel,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullContent += parsed.text;
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantId ? { ...message, content: fullContent } : message
                  )
                );
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // Skip parse errors for incomplete chunks
            }
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: fullContent || "I couldn't generate a response. Please try again.",
        timestamp: new Date(),
        isStreaming: false,
      };

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: assistantMessage.content,
                timestamp: assistantMessage.timestamp,
                isStreaming: false,
              }
            : message
        )
      );

      await saveMessage(activeSessionId, user.uid, userMessage);
      userMessagePersisted = true;
      await saveMessage(activeSessionId, user.uid, assistantMessage);

      if (isFirstRealMessage && userMessage.content.trim()) {
        await updateSessionTitle(activeSessionId, userMessage.content.trim().slice(0, 60));
      }

      await loadSessions(activeSessionId);
    } catch (error) {
      console.error("Chat error:", error);
      const fallbackText =
        error instanceof Error
          ? `Sorry, I encountered an error: ${error.message}`
          : "Sorry, I encountered an error. Please try again.";

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: fallbackText,
                isStreaming: false,
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date(),
              }
            : message
        )
      );

      // Persist user + error response to keep chat history complete
      try {
        if (!userMessagePersisted) {
          await saveMessage(activeSessionId, user.uid, userMessage);
        }

        await saveMessage(activeSessionId, user.uid, {
          id: assistantId,
          role: "assistant",
          content: fallbackText,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : "Unknown error",
          isStreaming: false,
        });

        if (isFirstRealMessage && userMessage.content.trim()) {
          await updateSessionTitle(activeSessionId, userMessage.content.trim().slice(0, 60));
        }

        await loadSessions(activeSessionId);
      } catch (persistError) {
        console.error("Failed to persist failed chat exchange:", persistError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const activeSession = sessions.find((session) => session.id === sessionId);

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-7xl mx-auto border rounded-2xl overflow-hidden bg-background/40">
      {/* Chat History Sidebar */}
      <aside className="hidden md:flex md:w-72 md:flex-col border-r bg-card/30">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Chat History</h2>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => void handleCreateNewChat()}
              disabled={isLoading}
            >
              <Plus className="h-3 w-3" />
              New
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isHistoryLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground p-3">No chats yet. Start a new chat.</div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === sessionId;

              return (
                <button
                  key={session.id}
                  onClick={() => {
                    setChatError(null);
                    setSessionId(session.id);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    isActive ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"
                  )}
                >
                  <p className="text-sm font-medium truncate">{session.title || "Untitled chat"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatSessionDate(session.updatedAt)} • {session.messageCount} messages
                  </p>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col">
        {/* Mobile chat header */}
        <div className="md:hidden p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="font-medium truncate max-w-[180px]">{activeSession?.title || "New Chat"}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleCreateNewChat()}
            disabled={isLoading}
            className="gap-1"
          >
            <Plus className="h-3 w-3" />
            New
          </Button>
        </div>

        {chatError && (
          <div className="mx-4 mt-4 bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
            {chatError}
          </div>
        )}

        {/* Messages Area */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {isMessagesLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap gap-2 border-t">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-sm"
              >
                <FileIcon type={getFileType({ name: attachment.name } as File)} />
                <span className="max-w-[180px] truncate">{attachment.name}</span>
                <button onClick={() => removeAttachment(attachment.id)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && void handleFileUpload(e.target.files)}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Attach files"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything... (Shift+Enter for new line)"
              className="flex-1 min-h-[44px] max-h-[200px] resize-none"
              disabled={isLoading}
              rows={1}
            />

            <Button
              onClick={() => void sendMessage()}
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              className="h-11"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>

          <div className="flex items-center justify-between mt-3">
            <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} disabled={isLoading} />
            <p className="text-xs text-muted-foreground">Drag & drop files • Stored in Firestore</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn("flex-1 max-w-[80%]", isUser && "flex flex-col items-end")}>
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((attachment) => (
              <Badge key={attachment.id} variant="secondary" className="flex items-center gap-1">
                <FileIcon type={getFileType({ name: attachment.name } as File)} />
                {attachment.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Message Content */}
        <Card className={cn("p-4", isUser && "bg-primary text-primary-foreground")}>
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <div className={cn("prose prose-sm max-w-none", isUser ? "prose-invert" : "dark:prose-invert")}>
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const inline = !match;

                    return inline ? (
                      <code className={cn("bg-muted px-1 py-0.5 rounded text-sm", className)} {...props}>
                        {children}
                      </code>
                    ) : (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg text-sm"
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    );
                  },
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </Card>

        {/* Search Results */}
        {message.searchResults && message.searchResults.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Search className="h-3 w-3" /> Web search results:
            </p>
            {message.searchResults.slice(0, 3).map((result, index) => (
              <a
                key={index}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-primary hover:underline truncate"
              >
                {result.title}
              </a>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground mt-1">{message.timestamp.toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
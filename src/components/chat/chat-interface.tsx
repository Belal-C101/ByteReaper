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
  Archive,
  Pencil,
  Trash2,
  ArchiveRestore,
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
  getArchivedChatSessions,
  getSessionMessages,
  saveChatExchange,
  renameChatSession,
  deleteChatSession,
  archiveChatSession,
  restoreArchivedChatSession,
} from "@/lib/chat-history";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const MAX_ATTACHMENT_SIZE_BYTES = 900 * 1024;
const DRAFT_CHAT_ID_PREFIX = "draft-chat-";
const EMPTY_STATE_PROMPTS = [
  "Review this React component for performance",
  "Find security issues in my Node API",
  "Explain this TypeScript error",
  "Compare Prisma vs Drizzle for Next.js",
];

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

function getFriendlyName(displayName?: string | null, email?: string | null): string {
  if (displayName?.trim()) {
    return displayName.trim().split(" ")[0];
  }

  if (email?.trim()) {
    return email.split("@")[0];
  }

  return "there";
}

function getDayGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function isPermissionDeniedError(error: unknown): boolean {
  const errorCode = (error as any)?.code;
  const errorMessage = (error as any)?.message;

  return (
    errorCode === "permission-denied" ||
    errorCode === "firestore/permission-denied" ||
    (typeof errorMessage === "string" && errorMessage.toLowerCase().includes("permission-denied")) ||
    (typeof errorMessage === "string" && errorMessage.toLowerCase().includes("insufficient permissions"))
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

type FileLike = {
  name: string;
  type?: string | null;
};

// File type detection
function getFileType(file: FileLike): "code" | "image" | "text" | "other" {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeType = file.type ?? "";
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
  if (mimeType.startsWith("text/")) return "text";
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
  const [archivedSessions, setArchivedSessions] = useState<ChatSession[]>([]);
  const [showArchivedChats, setShowArchivedChats] = useState(false);
  const [draftSession, setDraftSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  const createSessionWithRetry = useCallback(async (title: string): Promise<string> => {
    if (!user) {
      throw new Error("You must be logged in to create a chat session.");
    }

    const retryDelays = [0, 400, 900];
    let lastError: unknown = null;

    for (const delay of retryDelays) {
      if (delay > 0) {
        await sleep(delay);
      }

      try {
        await user.getIdToken(true);
        return await createChatSession(user.uid, title, selectedModel);
      } catch (error) {
        lastError = error;

        if (!isPermissionDeniedError(error)) {
          throw error;
        }
      }
    }

    throw lastError ?? new Error("Failed to create chat session.");
  }, [user, selectedModel]);

  const isDraftSessionId = useCallback(
    (candidateId: string | null | undefined) =>
      Boolean(candidateId && candidateId.startsWith(DRAFT_CHAT_ID_PREFIX)),
    []
  );

  const loadSessions = useCallback(
    async (preferredSessionId?: string | null) => {
      if (!user) return;

      setIsHistoryLoading(true);

      try {
        await user.getIdToken();
        const [fetchedSessions, fetchedArchivedSessions] = await Promise.all([
          getChatSessions(user.uid),
          getArchivedChatSessions(user.uid),
        ]);

        setArchivedSessions(fetchedArchivedSessions);

        const mergedSessions = draftSession ? [draftSession, ...fetchedSessions] : fetchedSessions;

        setSessions(mergedSessions);

        const nextSessionId =
          preferredSessionId && mergedSessions.some((session) => session.id === preferredSessionId)
            ? preferredSessionId
            : sessionId && mergedSessions.some((session) => session.id === sessionId)
              ? sessionId
              : mergedSessions.length > 0
                ? mergedSessions[0].id
                : null;

        if (nextSessionId !== sessionId) {
          setSessionId(nextSessionId);
        }
      } catch (error) {
        console.error("Failed to load chat sessions:", error);
        if (isPermissionDeniedError(error)) {
          setChatError(
            "Firestore denied access. Publish the latest Firestore rules for this project, then refresh the page."
          );
        } else {
          setChatError(getErrorMessage(error, "Could not load chat history right now."));
        }
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [user, sessionId, draftSession]
  );

  useEffect(() => {
    if (!user) {
      setSessionId(null);
      setSessions([]);
      setArchivedSessions([]);
      setDraftSession(null);
      setMessages([]);
      return;
    }

    void loadSessions();
  }, [user, loadSessions]);

  // Load selected chat messages
  useEffect(() => {
    if (!sessionId || isDraftSessionId(sessionId)) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsMessagesLoading(true);

    getSessionMessages(sessionId, user?.uid)
      .then((storedMessages) => {
        if (!isMounted) return;
        setMessages(storedMessages);
      })
      .catch((error) => {
        console.error("Failed to load chat messages:", error);
        if (isMounted) {
          setMessages([]);
          setChatError(getErrorMessage(error, "Could not load messages for this chat."));
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
  }, [sessionId, user?.uid, isDraftSessionId]);

  // Prefill prompt from landing page if available
  useEffect(() => {
    if (sessionId && !isDraftSessionId(sessionId)) return;

    const pendingPrompt = sessionStorage.getItem("bytereaper_landing_prompt");
    if (pendingPrompt) {
      setInput(pendingPrompt);
      sessionStorage.removeItem("bytereaper_landing_prompt");
    }
  }, [sessionId, isDraftSessionId]);

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

    const draftId = `${DRAFT_CHAT_ID_PREFIX}${Date.now()}`;
    const now = new Date();

    const nextDraft: ChatSession = {
      id: draftId,
      userId: user.uid,
      title: "New Chat",
      model: selectedModel,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      isArchived: false,
      isDraft: true,
    };

    setDraftSession(nextDraft);
    setSessions((prev) => [nextDraft, ...prev.filter((session) => !session.isDraft)]);
    setSessionId(draftId);
    setMessages([]);
    setInput("");
    setAttachments([]);
  }, [user, isLoading, selectedModel]);

  const handleRenameSession = useCallback(
    async (session: ChatSession) => {
      if (!user) return;

      const nextName = window.prompt("Rename chat", session.title);
      if (!nextName || !nextName.trim()) return;

      setChatError(null);

      try {
        const renamedSessionId = await renameChatSession(session.id, nextName.trim(), user.uid);
        const shouldKeepSelected = sessionId === session.id;

        await loadSessions(shouldKeepSelected ? renamedSessionId : null);

        if (shouldKeepSelected) {
          setSessionId(renamedSessionId);
        }
      } catch (error) {
        console.error("Failed to rename chat:", error);
        setChatError(getErrorMessage(error, "Could not rename this chat right now."));
      }
    },
    [user, sessionId, loadSessions]
  );

  const handleArchiveSession = useCallback(
    async (session: ChatSession) => {
      if (!user) return;

      setChatError(null);

      try {
        await archiveChatSession(session.id, user.uid);

        if (sessionId === session.id) {
          setSessionId(null);
          setMessages([]);
        }

        await loadSessions();
      } catch (error) {
        console.error("Failed to archive chat:", error);
        setChatError(getErrorMessage(error, "Could not archive this chat right now."));
      }
    },
    [user, sessionId, loadSessions]
  );

  const handleRestoreArchivedSession = useCallback(
    async (session: ChatSession) => {
      if (!user) return;

      setChatError(null);

      try {
        await restoreArchivedChatSession(session.id, user.uid);
        await loadSessions(session.id);
        setSessionId(session.id);
      } catch (error) {
        console.error("Failed to restore archived chat:", error);
        setChatError(getErrorMessage(error, "Could not restore this archived chat right now."));
      }
    },
    [user, loadSessions]
  );

  const handleDeleteSession = useCallback(
    async (session: ChatSession) => {
      if (!user) return;

      const shouldDelete = window.confirm(`Delete "${session.title}"? This cannot be undone.`);
      if (!shouldDelete) return;

      setChatError(null);

      try {
        await deleteChatSession(session.id, user.uid);

        if (sessionId === session.id) {
          setSessionId(null);
          setMessages([]);
        }

        if (draftSession?.id === session.id) {
          setDraftSession(null);
        }

        await loadSessions();
      } catch (error) {
        console.error("Failed to delete chat:", error);
        setChatError(getErrorMessage(error, "Could not delete this chat right now."));
      }
    },
    [user, sessionId, draftSession, loadSessions]
  );

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    setChatError(null);
    const newAttachments: FileAttachment[] = [];

    for (const file of Array.from(files)) {
      try {
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
      } catch (fileError) {
        console.error(`Failed to process attachment ${file.name}:`, fileError);
        setChatError(`Could not attach "${file.name}". Try a different file.`);
      }
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

    if (sessionId && archivedSessions.some((session) => session.id === sessionId)) {
      setChatError("This chat is archived. Restore it before sending new messages.");
      return;
    }

    setChatError(null);

    try {
      await user.getIdToken();
    } catch (tokenError) {
      setChatError(getErrorMessage(tokenError, "Your session expired. Please sign in again."));
      return;
    }

    const trimmedInput = input.trim();
    const normalizedPrompt =
      trimmedInput ||
      (attachments.length > 0 ? "Please analyze the attached file(s)." : "");

    let activeSessionId = sessionId;
    let canPersistToFirestore = true;
    if (!activeSessionId || isDraftSessionId(activeSessionId)) {
      try {
        activeSessionId = await createSessionWithRetry(normalizedPrompt || "New Chat");
        setDraftSession(null);
        setSessionId(activeSessionId);
        await loadSessions(activeSessionId);
      } catch (error) {
        console.error("Failed to initialize chat session:", error);
        canPersistToFirestore = false;
        if (isPermissionDeniedError(error)) {
          setChatError(
            "Chat history is blocked by Firestore rules (permission-denied). You can still chat, but data will not save until rules are published."
          );
        } else {
          setChatError(
            "Chat history is unavailable right now. You can still send messages, but they may not be saved."
          );
        }
      }
    }

    const historyForModel = messages.slice(-10);
    let modelUsedForExchange = selectedModel;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: normalizedPrompt,
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
              if (typeof parsed.model === "string" && parsed.model.trim()) {
                modelUsedForExchange = parsed.model;
              } else if (parsed.text) {
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

      if (canPersistToFirestore && activeSessionId) {
        try {
          await saveChatExchange(activeSessionId, user.uid, userMessage, assistantMessage, modelUsedForExchange);

          await loadSessions(activeSessionId);
        } catch (persistError) {
          console.error("Failed to save successful chat exchange:", persistError);
          setChatError(getErrorMessage(persistError, "Message sent, but chat history could not be saved."));
        }
      }
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
      if (canPersistToFirestore && activeSessionId) {
        try {
          await saveChatExchange(activeSessionId, user.uid, userMessage, {
            id: assistantId,
            role: "assistant",
            content: fallbackText,
            timestamp: new Date(),
            error: error instanceof Error ? error.message : "Unknown error",
            isStreaming: false,
          }, modelUsedForExchange);

          await loadSessions(activeSessionId);
        } catch (persistError) {
          console.error("Failed to persist failed chat exchange:", persistError);
        }
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

  const handleQuickPromptSelect = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const activeSession = [...sessions, ...archivedSessions].find((session) => session.id === sessionId);
  const friendlyName = getFriendlyName(user?.displayName, user?.email);

  return (
    <div className="relative flex h-[calc(100vh-8rem)] w-full border-y overflow-hidden bg-background/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_62%_34%,rgba(59,130,246,0.14),transparent_42%),radial-gradient(circle_at_16%_78%,rgba(163,163,163,0.12),transparent_45%)]" />

      {/* Chat History Sidebar */}
      <aside className="relative hidden md:flex md:w-72 md:flex-col border-r bg-card/40 backdrop-blur">
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

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {isHistoryLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              {sessions.length === 0 ? (
                <div className="text-sm text-muted-foreground p-3">No active chats yet. Start a new chat.</div>
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
                        "group w-full text-left p-3 rounded-lg border transition-colors",
                        isActive ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{session.title || "Untitled chat"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {session.isDraft
                              ? "Not saved yet"
                              : `${formatSessionDate(session.updatedAt)} • ${session.messageCount} messages`}
                          </p>
                        </div>

                        {!session.isDraft && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleRenameSession(session);
                              }}
                              className="p-1.5 rounded hover:bg-background/70"
                              title="Rename chat"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleArchiveSession(session);
                              }}
                              className="p-1.5 rounded hover:bg-background/70"
                              title="Archive chat"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDeleteSession(session);
                              }}
                              className="p-1.5 rounded hover:bg-destructive/20 text-destructive"
                              title="Delete chat"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}

              <div className="pt-2 mt-1 border-t">
                <button
                  type="button"
                  onClick={() => setShowArchivedChats((prev) => !prev)}
                  className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Archive className="h-3.5 w-3.5" />
                    Archived Chats
                  </span>
                  <span>{archivedSessions.length}</span>
                </button>

                {showArchivedChats && (
                  <div className="space-y-1 mt-1">
                    {archivedSessions.length === 0 ? (
                      <div className="text-xs text-muted-foreground px-2 py-2">No archived chats yet.</div>
                    ) : (
                      archivedSessions.map((session) => (
                        <button
                          key={session.id}
                          onClick={() => {
                            setChatError(null);
                            setSessionId(session.id);
                          }}
                          className={cn(
                            "group w-full text-left p-2.5 rounded-lg border transition-colors",
                            session.id === sessionId
                              ? "border-primary bg-primary/10"
                              : "border-transparent hover:bg-accent"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{session.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatSessionDate(session.updatedAt)} • {session.messageCount} messages
                              </p>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleRestoreArchivedSession(session);
                                }}
                                className="p-1.5 rounded hover:bg-background/70"
                                title="Restore chat"
                              >
                                <ArchiveRestore className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleDeleteSession(session);
                                }}
                                className="p-1.5 rounded hover:bg-destructive/20 text-destructive"
                                title="Delete chat"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main Chat Panel */}
      <div className="relative flex-1 flex flex-col">
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
          className="flex-1 overflow-y-auto p-4 space-y-4 pb-56"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {isMessagesLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <EmptyChatState friendlyName={friendlyName} onSelectPrompt={handleQuickPromptSelect} />
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Composer */}
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20">
          <div className="pointer-events-auto rounded-2xl border bg-background/95 backdrop-blur-md shadow-2xl p-3 md:p-4">
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-sm"
                  >
                    <FileIcon type={getFileType({ name: attachment.name, type: attachment.type })} />
                    <span className="max-w-[180px] truncate">{attachment.name}</span>
                    <button onClick={() => removeAttachment(attachment.id)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
    </div>
  );
}

function EmptyChatState({
  friendlyName,
  onSelectPrompt,
}: {
  friendlyName: string;
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="h-full flex items-center justify-center px-4">
      <div className="w-full max-w-3xl text-center space-y-6">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground/90">
          {/* <span className="text-primary mr-2">✶</span> */}
          {getDayGreeting()}, {friendlyName}
        </h2>

        <p className="text-sm md:text-base text-muted-foreground">
          Ask anything about code, architecture, debugging, or docs. I’ll keep ByteReaper’s vibe while thinking like a senior teammate.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {EMPTY_STATE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelectPrompt(prompt)}
              className="px-3 py-1.5 text-xs md:text-sm rounded-full border bg-card/70 hover:bg-accent transition-colors"
            >
              {prompt}
            </button>
          ))}
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
                <FileIcon type={getFileType({ name: attachment.name, type: attachment.type })} />
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
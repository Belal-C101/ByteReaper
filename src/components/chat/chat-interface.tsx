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
  Hash,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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

const generateId = () => Math.random().toString(36).substring(2, 15);

function getFriendlyName(displayName?: string | null, email?: string | null): string {
  if (displayName?.trim()) return displayName.trim().split(" ")[0];
  if (email?.trim()) return email.split("@")[0];
  return "there";
}

function getDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
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
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return "Yesterday";
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupSessionsByDate(sessions: ChatSession[]): { label: string; sessions: ChatSession[] }[] {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { label: string; sessions: ChatSession[] }[] = [
    { label: "Today", sessions: [] },
    { label: "Yesterday", sessions: [] },
    { label: "Previous 7 Days", sessions: [] },
    { label: "Older", sessions: [] },
  ];

  for (const session of sessions) {
    const dateStr = session.updatedAt.toDateString();
    if (dateStr === today) {
      groups[0].sessions.push(session);
    } else if (dateStr === yesterdayStr) {
      groups[1].sessions.push(session);
    } else if (session.updatedAt > weekAgo) {
      groups[2].sessions.push(session);
    } else {
      groups[3].sessions.push(session);
    }
  }

  return groups.filter((g) => g.sessions.length > 0);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

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
type FileLike = { name: string; type?: string | null };

function getFileType(file: FileLike): "code" | "image" | "text" | "other" {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeType = file.type ?? "";
  const codeExts = ["js", "ts", "jsx", "tsx", "py", "java", "cpp", "c", "h", "css", "html", "json", "md", "yaml", "yml", "sql", "sh", "bash", "go", "rs", "rb", "php"];
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
  if (codeExts.includes(ext)) return "code";
  if (imageExts.includes(ext)) return "image";
  if (mimeType.startsWith("text/")) return "text";
  return "other";
}

function FileIcon({ type }: { type: "code" | "image" | "text" | "other" }) {
  switch (type) {
    case "code": return <FileCode className="h-3.5 w-3.5" />;
    case "image": return <ImageIcon className="h-3.5 w-3.5" />;
    default: return <File className="h-3.5 w-3.5" />;
  }
}

// ─── Model Selector ──────────────────────────────────────

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
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
          "border border-border/60 bg-background/60 hover:bg-accent/60",
          "transition-all duration-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-muted-foreground">{model.description}</span>
        <span className="font-medium text-foreground hidden sm:inline">{model.name}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 w-72 bg-popover/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-xl z-20 py-1.5 overflow-hidden"
            >
              {(Object.entries(AI_MODELS) as [ModelKey, (typeof AI_MODELS)[ModelKey]][]).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => { onSelect(key); setIsOpen(false); }}
                  className={cn(
                    "w-full px-3.5 py-2.5 text-left flex items-center justify-between",
                    "hover:bg-accent/60 transition-colors duration-150",
                    key === selectedModel && "bg-primary/[0.06]"
                  )}
                >
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground/70">{m.provider}</div>
                  </div>
                  <span className="text-sm">{m.description}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary/50"
          animate={{ scale: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Main Chat Interface ─────────────────────────────────

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
  const [composerFocused, setComposerFocused] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const createSessionWithRetry = useCallback(async (title: string): Promise<string> => {
    if (!user) throw new Error("You must be logged in to create a chat session.");
    const retryDelays = [0, 400, 900];
    let lastError: unknown = null;
    for (const delay of retryDelays) {
      if (delay > 0) await sleep(delay);
      try {
        await user.getIdToken(true);
        return await createChatSession(user.uid, title, selectedModel);
      } catch (error) {
        lastError = error;
        if (!isPermissionDeniedError(error)) throw error;
      }
    }
    throw lastError ?? new Error("Failed to create chat session.");
  }, [user, selectedModel]);

  const isDraftSessionId = useCallback(
    (candidateId: string | null | undefined) => Boolean(candidateId && candidateId.startsWith(DRAFT_CHAT_ID_PREFIX)),
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
          preferredSessionId && mergedSessions.some((s) => s.id === preferredSessionId)
            ? preferredSessionId
            : sessionId && mergedSessions.some((s) => s.id === sessionId)
              ? sessionId
              : mergedSessions.length > 0
                ? mergedSessions[0].id
                : null;
        if (nextSessionId !== sessionId) setSessionId(nextSessionId);
      } catch (error) {
        console.error("Failed to load chat sessions:", error);
        if (isPermissionDeniedError(error)) {
          setChatError("Firestore denied access. Publish the latest Firestore rules, then refresh.");
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
      setSessionId(null); setSessions([]); setArchivedSessions([]); setDraftSession(null); setMessages([]);
      return;
    }
    void loadSessions();
  }, [user, loadSessions]);

  useEffect(() => {
    if (!sessionId || isDraftSessionId(sessionId)) { setMessages([]); return; }
    let isMounted = true;
    setIsMessagesLoading(true);
    getSessionMessages(sessionId, user?.uid)
      .then((stored) => { if (isMounted) setMessages(stored); })
      .catch((error) => {
        console.error("Failed to load chat messages:", error);
        if (isMounted) { setMessages([]); setChatError(getErrorMessage(error, "Could not load messages.")); }
      })
      .finally(() => { if (isMounted) setIsMessagesLoading(false); });
    return () => { isMounted = false; };
  }, [sessionId, user?.uid, isDraftSessionId]);

  useEffect(() => {
    if (sessionId && !isDraftSessionId(sessionId)) return;
    const pendingPrompt = sessionStorage.getItem("bytereaper_landing_prompt");
    if (pendingPrompt) { setInput(pendingPrompt); sessionStorage.removeItem("bytereaper_landing_prompt"); }
  }, [sessionId, isDraftSessionId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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
      id: draftId, userId: user.uid, title: "New Chat", model: selectedModel,
      createdAt: now, updatedAt: now, messageCount: 0, isArchived: false, isDraft: true,
    };
    setDraftSession(nextDraft);
    setSessions((prev) => [nextDraft, ...prev.filter((s) => !s.isDraft)]);
    setSessionId(draftId);
    setMessages([]); setInput(""); setAttachments([]);
  }, [user, isLoading, selectedModel]);

  const handleRenameSession = useCallback(async (session: ChatSession) => {
    if (!user) return;
    const nextName = window.prompt("Rename chat", session.title);
    if (!nextName?.trim()) return;
    setChatError(null);
    try {
      const renamedId = await renameChatSession(session.id, nextName.trim(), user.uid);
      const shouldKeepSelected = sessionId === session.id;
      await loadSessions(shouldKeepSelected ? renamedId : null);
      if (shouldKeepSelected) setSessionId(renamedId);
    } catch (error) {
      console.error("Failed to rename chat:", error);
      setChatError(getErrorMessage(error, "Could not rename this chat."));
    }
  }, [user, sessionId, loadSessions]);

  const handleArchiveSession = useCallback(async (session: ChatSession) => {
    if (!user) return;
    setChatError(null);
    try {
      await archiveChatSession(session.id, user.uid);
      if (sessionId === session.id) { setSessionId(null); setMessages([]); }
      await loadSessions();
    } catch (error) {
      console.error("Failed to archive chat:", error);
      setChatError(getErrorMessage(error, "Could not archive this chat."));
    }
  }, [user, sessionId, loadSessions]);

  const handleRestoreArchivedSession = useCallback(async (session: ChatSession) => {
    if (!user) return;
    setChatError(null);
    try {
      await restoreArchivedChatSession(session.id, user.uid);
      await loadSessions(session.id);
      setSessionId(session.id);
    } catch (error) {
      console.error("Failed to restore archived chat:", error);
      setChatError(getErrorMessage(error, "Could not restore this archived chat."));
    }
  }, [user, loadSessions]);

  const handleDeleteSession = useCallback(async (session: ChatSession) => {
    if (!user) return;
    const shouldDelete = window.confirm(`Delete "${session.title}"? This cannot be undone.`);
    if (!shouldDelete) return;
    setChatError(null);
    try {
      await deleteChatSession(session.id, user.uid);
      if (sessionId === session.id) { setSessionId(null); setMessages([]); }
      if (draftSession?.id === session.id) setDraftSession(null);
      await loadSessions();
    } catch (error) {
      console.error("Failed to delete chat:", error);
      setChatError(getErrorMessage(error, "Could not delete this chat."));
    }
  }, [user, sessionId, draftSession, loadSessions]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    setChatError(null);
    const newAttachments: FileAttachment[] = [];
    for (const file of Array.from(files)) {
      try {
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          setChatError(`"${file.name}" is too large. Keep files under ${Math.round(MAX_ATTACHMENT_SIZE_BYTES / 1024)}KB.`);
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
          if (fileType === "image") preview = dataUrl;
        }
        newAttachments.push({
          id: generateId(), name: file.name,
          type: file.type || `application/${file.name.split(".").pop()}`,
          size: file.size, content, preview,
        });
      } catch (fileError) {
        console.error(`Failed to process attachment ${file.name}:`, fileError);
        setChatError(`Could not attach "${file.name}". Try a different file.`);
      }
    }
    if (newAttachments.length > 0) setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) void handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading || !user) return;
    if (sessionId && archivedSessions.some((s) => s.id === sessionId)) {
      setChatError("This chat is archived. Restore it before sending new messages.");
      return;
    }
    setChatError(null);
    try { await user.getIdToken(); } catch {
      setChatError("Your session expired. Please sign in again.");
      return;
    }

    const trimmedInput = input.trim();
    const normalizedPrompt = trimmedInput || (attachments.length > 0 ? "Please analyze the attached file(s)." : "");
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
        setChatError(isPermissionDeniedError(error)
          ? "Chat history is blocked by Firestore rules. You can still chat, but data won't save."
          : "Chat history is unavailable. Messages may not be saved."
        );
      }
    }

    const historyForModel = messages.slice(-10);
    let modelUsedForExchange = selectedModel;

    const userMessage: ChatMessage = {
      id: generateId(), role: "user", content: normalizedPrompt,
      timestamp: new Date(), attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    const assistantId = generateId();

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true },
    ]);
    setInput(""); setAttachments([]); setIsLoading(true);

    try {
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

      if (!response.ok) throw new Error("Failed to get response");

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
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullContent } : m));
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch { /* skip incomplete chunks */ }
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: assistantId, role: "assistant",
        content: fullContent || "I couldn't generate a response. Please try again.",
        timestamp: new Date(), isStreaming: false,
      };

      setMessages((prev) => prev.map((m) => m.id === assistantId
        ? { ...m, content: assistantMessage.content, timestamp: assistantMessage.timestamp, isStreaming: false }
        : m
      ));

      if (canPersistToFirestore && activeSessionId) {
        try {
          await saveChatExchange(activeSessionId, user.uid, userMessage, assistantMessage, modelUsedForExchange);
          await loadSessions(activeSessionId);
        } catch (persistError) {
          console.error("Failed to save chat exchange:", persistError);
          setChatError(getErrorMessage(persistError, "Message sent, but chat history could not be saved."));
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const fallbackText = error instanceof Error
        ? `Sorry, I encountered an error: ${error.message}`
        : "Sorry, I encountered an error. Please try again.";

      setMessages((prev) => prev.map((m) => m.id === assistantId
        ? { ...m, content: fallbackText, isStreaming: false, error: error instanceof Error ? error.message : "Unknown error", timestamp: new Date() }
        : m
      ));

      if (canPersistToFirestore && activeSessionId) {
        try {
          await saveChatExchange(activeSessionId, user.uid, userMessage, {
            id: assistantId, role: "assistant", content: fallbackText,
            timestamp: new Date(), error: error instanceof Error ? error.message : "Unknown error", isStreaming: false,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  };

  const handleQuickPromptSelect = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const activeSession = [...sessions, ...archivedSessions].find((s) => s.id === sessionId);
  const friendlyName = getFriendlyName(user?.displayName, user?.email);
  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <div className="relative flex h-[calc(100vh-7rem)] w-full overflow-hidden bg-background">
      {/* Subtle ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-[30%] w-[600px] h-[400px] bg-primary/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-[20%] w-[500px] h-[300px] bg-blue-400/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* ─── Sidebar ──────────────────────────────── */}
      <aside className="relative hidden md:flex md:w-[280px] md:flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-border/40">
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 h-9 justify-center border-border/50 bg-background/50 hover:bg-accent/60 transition-all duration-200"
            onClick={() => void handleCreateNewChat()}
            disabled={isLoading}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-sm">New Chat</span>
          </Button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto py-2">
          {isHistoryLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <>
              {sessions.length === 0 ? (
                <div className="text-xs text-muted-foreground/60 p-4 text-center">
                  No chats yet. Start a conversation.
                </div>
              ) : (
                groupedSessions.map((group) => (
                  <div key={group.label} className="mb-1">
                    <div className="px-4 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                        {group.label}
                      </span>
                    </div>
                    {group.sessions.map((session) => {
                      const isActive = session.id === sessionId;
                      return (
                        <button
                          key={session.id}
                          onClick={() => { setChatError(null); setSessionId(session.id); }}
                          className={cn(
                            "group w-full text-left px-3 py-2.5 mx-1.5 rounded-lg transition-all duration-150",
                            "hover:bg-accent/50",
                            isActive
                              ? "bg-primary/[0.08] border-l-2 border-l-primary"
                              : "border-l-2 border-l-transparent"
                          )}
                          style={{ width: "calc(100% - 12px)" }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className={cn(
                                "text-sm truncate",
                                isActive ? "font-medium text-foreground" : "text-foreground/80"
                              )}>
                                {session.title || "Untitled chat"}
                              </p>
                              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                                {session.isDraft
                                  ? "Not saved yet"
                                  : `${formatSessionDate(session.updatedAt)} · ${session.messageCount} msgs`}
                              </p>
                            </div>

                            {!session.isDraft && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); void handleRenameSession(session); }}
                                  className="p-1 rounded-md hover:bg-background/60 text-muted-foreground/60 hover:text-foreground transition-colors"
                                  title="Rename"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); void handleArchiveSession(session); }}
                                  className="p-1 rounded-md hover:bg-background/60 text-muted-foreground/60 hover:text-foreground transition-colors"
                                  title="Archive"
                                >
                                  <Archive className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); void handleDeleteSession(session); }}
                                  className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}

              {/* Archive toggle */}
              <div className="mx-3 mt-2 pt-2 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setShowArchivedChats((prev) => !prev)}
                  className="w-full flex items-center justify-between px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Archive className="h-3 w-3" />
                    Archived
                  </span>
                  <span className="text-[10px] tabular-nums">{archivedSessions.length}</span>
                </button>

                <AnimatePresence>
                  {showArchivedChats && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {archivedSessions.length === 0 ? (
                        <div className="text-xs text-muted-foreground/40 px-2 py-2">No archived chats.</div>
                      ) : (
                        archivedSessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => { setChatError(null); setSessionId(session.id); }}
                            className={cn(
                              "group w-full text-left px-2 py-2 rounded-lg transition-colors",
                              "hover:bg-accent/40",
                              session.id === sessionId && "bg-primary/[0.06]"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm truncate text-foreground/70">{session.title}</p>
                                <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                                  {formatSessionDate(session.updatedAt)} · {session.messageCount} msgs
                                </p>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); void handleRestoreArchivedSession(session); }}
                                  className="p-1 rounded-md hover:bg-background/60 text-muted-foreground/60 hover:text-foreground transition-colors"
                                  title="Restore"
                                >
                                  <ArchiveRestore className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); void handleDeleteSession(session); }}
                                  className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground/60 hover:text-destructive transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ─── Main Chat Panel ──────────────────────── */}
      <div className="relative flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="md:hidden p-3 border-b border-border/40 flex items-center justify-between bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Hash className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            <span className="font-medium truncate text-foreground/80">{activeSession?.title || "New Chat"}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleCreateNewChat()}
            disabled={isLoading}
            className="gap-1 h-8 text-muted-foreground"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {chatError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mt-3"
            >
              <div className="bg-destructive/[0.06] border border-destructive/20 text-destructive px-4 py-2.5 rounded-xl text-sm flex items-center justify-between">
                <span>{chatError}</span>
                <button onClick={() => setChatError(null)} className="p-1 hover:bg-destructive/10 rounded-md ml-3 shrink-0">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages Area */}
        <div
          className="flex-1 overflow-y-auto px-4 md:px-0 pb-52"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="max-w-3xl mx-auto py-4 space-y-1">
            {isMessagesLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground pt-32">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyChatState friendlyName={friendlyName} onSelectPrompt={handleQuickPromptSelect} />
            ) : (
              messages.map((message, idx) => (
                <MessageBubble key={message.id} message={message} isLast={idx === messages.length - 1} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ─── Floating Composer ────────────────── */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pt-16">
          <div className="pointer-events-auto max-w-3xl mx-auto">
            <div
              className={cn(
                "rounded-2xl border bg-background/90 backdrop-blur-xl shadow-lg transition-all duration-300",
                composerFocused
                  ? "border-primary/30 shadow-xl glow-blue-sm"
                  : "border-border/50 shadow-lg"
              )}
            >
              {/* Attachments */}
              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/60 rounded-lg text-xs"
                        >
                          <FileIcon type={getFileType({ name: attachment.name, type: attachment.type })} />
                          <span className="max-w-[140px] truncate text-muted-foreground">{attachment.name}</span>
                          <button onClick={() => removeAttachment(attachment.id)} className="hover:text-destructive transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input area */}
              <div className="flex items-end gap-2 p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && void handleFileUpload(e.target.files)}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="p-2 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-all duration-150 disabled:opacity-40"
                  title="Attach files"
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setComposerFocused(true)}
                  onBlur={() => setComposerFocused(false)}
                  placeholder="Ask me anything…"
                  className="flex-1 min-h-[40px] max-h-[200px] resize-none bg-transparent outline-none text-sm placeholder:text-muted-foreground/40 py-2"
                  disabled={isLoading}
                  rows={1}
                />

                <button
                  onClick={() => void sendMessage()}
                  disabled={isLoading || (!input.trim() && attachments.length === 0)}
                  className={cn(
                    "p-2.5 rounded-xl transition-all duration-200",
                    isLoading || (!input.trim() && attachments.length === 0)
                      ? "text-muted-foreground/30 bg-transparent cursor-not-allowed"
                      : "text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm"
                  )}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-4 pb-2.5 pt-0">
                <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} disabled={isLoading} />
                <p className="text-[10px] text-muted-foreground/40 hidden sm:block">Shift+Enter for new line</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────

function EmptyChatState({
  friendlyName,
  onSelectPrompt,
}: {
  friendlyName: string;
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-2xl text-center space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/[0.08] mx-auto mb-2"
        >
          <Sparkles className="h-6 w-6 text-primary" />
        </motion.div>

        <div>
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight text-foreground/90 mb-2">
            {getDayGreeting()}, {friendlyName}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground/60 max-w-md mx-auto">
            Ask anything about code, architecture, debugging, or docs.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {EMPTY_STATE_PROMPTS.map((prompt, i) => (
            <motion.button
              key={prompt}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
              type="button"
              onClick={() => onSelectPrompt(prompt)}
              className="px-3.5 py-2 text-xs md:text-sm rounded-xl border border-border/50 bg-card/50 hover:bg-accent/50 hover:border-border transition-all duration-200"
            >
              {prompt}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────

function MessageBubble({ message, isLast }: { message: ChatMessage; isLast?: boolean }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex gap-3 py-3", isUser ? "justify-end" : "justify-start")}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          <div className="h-7 w-7 rounded-lg bg-primary/[0.08] flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-primary/70" />
          </div>
        </div>
      )}

      <div className={cn("max-w-[85%] md:max-w-[75%]", isUser && "flex flex-col items-end")}>
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.attachments.map((attachment) => (
              <span key={attachment.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/60 text-xs text-muted-foreground">
                <FileIcon type={getFileType({ name: attachment.name, type: attachment.type })} />
                {attachment.name}
              </span>
            ))}
          </div>
        )}

        {/* Message Content */}
        <div
          className={cn(
            "relative",
            isUser
              ? "bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-md"
              : "px-0.5"
          )}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2 py-1">
              <TypingIndicator />
              <span className="text-xs text-muted-foreground/50">Thinking…</span>
            </div>
          ) : (
            <div className={cn(
              "prose prose-sm max-w-none",
              isUser
                ? "prose-invert [&_*]:text-primary-foreground/95"
                : "dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-code:text-sm"
            )}>
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const inline = !match;
                    return inline ? (
                      <code className={cn("bg-muted/60 dark:bg-muted/40 px-1.5 py-0.5 rounded-md text-[13px] font-mono", className)} {...props}>
                        {children}
                      </code>
                    ) : (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="!rounded-xl !text-[13px] !bg-[#1e1e2e] border border-border/20"
                        customStyle={{ margin: "0.5rem 0", padding: "1rem" }}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    );
                  },
                  a({ href, children }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
        </div>

        {/* Search Results */}
        {message.searchResults && message.searchResults.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
              <Search className="h-3 w-3" /> Sources:
            </p>
            {message.searchResults.slice(0, 3).map((result, index) => (
              <a
                key={index}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-primary/70 hover:text-primary hover:underline truncate transition-colors"
              >
                {result.title}
              </a>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-muted-foreground/30 mt-1.5">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="shrink-0 mt-0.5">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  Copy,
  Check,
  Menu,
  Globe,
  Brain,
  GraduationCap,
  BookOpen,
  Zap,
  Languages,
  Code2,
  Download,
  ExternalLink,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ChatMessage, FileAttachment, UploadedMediaLink } from "@/types/chat";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChatSession,
  createSharedChat,
  createChatSession,
  getChatSessions,
  getArchivedChatSessions,
  getSessionMessages,
  getUserPromptTemplates,
  saveChatExchange,
  updateSessionUserMessageLinks,
  saveUserPromptTemplate,
  renameChatSession,
  deleteChatSession,
  archiveChatSession,
  restoreArchivedChatSession,
} from "@/lib/chat-history";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";

const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = 1;
const DRAFT_CHAT_ID_PREFIX = "draft-chat-";
const EMPTY_STATE_PROMPTS = [
  "Review this React component for performance",
  "Find security issues in my Node API",
  "Explain this TypeScript error",
  "Compare Prisma vs Drizzle for Next.js",
];

const SLASH_COMMANDS = [
  { command: "search", description: "Search the web", usage: "/search <query>" },
  { command: "analyze", description: "Analyze a GitHub repository", usage: "/analyze <github-url>" },
  { command: "translate", description: "Translate code", usage: "/translate <source> <target> <code>" },
  { command: "review", description: "Review the latest code block", usage: "/review" },
  { command: "commit", description: "Generate commit message", usage: "/commit" },
  { command: "explain", description: "Explain latest code block", usage: "/explain" },
  { command: "simplify", description: "Simplify latest code block", usage: "/simplify" },
];

const BUILT_IN_PROMPT_TEMPLATES = [
  "Review this code for bugs and security issues",
  "Explain this code step by step",
  "Optimize this code for performance",
  "Write unit tests for this code",
  "Convert this to TypeScript",
  "Add error handling to this code",
  "Document this code with JSDoc comments",
];

type CodeTheme = "oneDark" | "oneLight";

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

function sortSessionsByUpdatedAt(list: ChatSession[]): ChatSession[] {
  return [...list].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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
  auto: { name: "Auto (Best Available)", description: "🎲 Auto-select", provider: "OpenRouter" },
  "gemini-flash": { name: "Gemini 2.5 Flash", description: "👁️ Vision + Fast", provider: "Google" },
  "gemini-flash-lite": { name: "Gemini 2.5 Flash Lite", description: "⚡ Fast + Vision", provider: "Google" },
  nemotron: { name: "Nemotron 3 Super 120B", description: "🚀 Powerful", provider: "NVIDIA" },
  "qwen-plus": { name: "Qwen 3.6 Plus", description: "🧠 Reasoning", provider: "Qwen" },
  minimax: { name: "MiniMax M2.5", description: "⚡ Fast", provider: "MiniMax" },
  liquid: { name: "LFM 2.5 Instruct", description: "📝 Instruct", provider: "LiquidAI" },
} as const;

type ModelKey = keyof typeof AI_MODELS;
type FileLike = { name: string; type?: string | null };

const EXTENSION_MIME_MAP: Record<string, string> = {
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  csv: "text/csv",
  xml: "application/xml",
  ini: "text/plain",
  log: "text/plain",
  json: "application/json",
  js: "text/javascript",
  jsx: "text/javascript",
  ts: "text/typescript",
  tsx: "text/typescript",
  py: "text/x-python",
  java: "text/x-java-source",
  c: "text/x-c",
  cpp: "text/x-c++src",
  h: "text/x-c",
  css: "text/css",
  html: "text/html",
  yml: "application/x-yaml",
  yaml: "application/x-yaml",
  sql: "application/sql",
  sh: "application/x-sh",
  bash: "application/x-sh",
  go: "text/x-go",
  rs: "text/rust",
  rb: "text/x-ruby",
  php: "application/x-httpd-php",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
};

const IMAGE_UPLOAD_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "bmp",
  "ico",
  "avif",
  "heic",
]);

const CODE_AND_DOC_UPLOAD_EXTENSIONS = new Set([
  "js",
  "ts",
  "jsx",
  "tsx",
  "py",
  "java",
  "cpp",
  "c",
  "h",
  "go",
  "rs",
  "rb",
  "php",
  "md",
  "markdown",
  "txt",
  "json",
  "yaml",
  "yml",
  "sql",
  "sh",
  "bash",
  "csv",
  "xml",
  "html",
  "css",
]);

const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  ...Array.from(IMAGE_UPLOAD_EXTENSIONS),
  ...Array.from(CODE_AND_DOC_UPLOAD_EXTENSIONS),
]);

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/x-yaml",
  "application/yaml",
  "application/pdf",
  "application/sql",
  "application/x-sh",
  "application/x-httpd-php",
  "text/javascript",
  "text/typescript",
  "text/x-python",
  "text/x-java-source",
  "text/x-c",
  "text/x-c++src",
  "text/x-go",
  "text/rust",
  "text/x-ruby",
]);

const SUPPORTED_UPLOAD_FILES_HINT =
  "Supported files include source files (.js, .ts, .py, .java, .cpp, .go, .rs, .rb, .php), text/docs, and images.";

function resolveMimeType(file: FileLike): string {
  if (typeof file.type === "string" && file.type.trim().length > 0) {
    return file.type;
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_MIME_MAP[ext] || "application/octet-stream";
}

function getLowercaseExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

function isAllowedUploadFile(file: FileLike): boolean {
  const ext = getLowercaseExtension(file.name);
  const mimeType = resolveMimeType(file).toLowerCase();

  if (ALLOWED_UPLOAD_EXTENSIONS.has(ext)) return true;
  if (mimeType.startsWith("image/") || mimeType.startsWith("text/")) return true;
  return ALLOWED_UPLOAD_MIME_TYPES.has(mimeType);
}

function getFileType(file: FileLike): "code" | "image" | "text" | "other" {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeType = resolveMimeType(file);
  const codeExts = ["js", "ts", "jsx", "tsx", "py", "java", "cpp", "c", "h", "css", "html", "json", "md", "yaml", "yml", "sql", "sh", "bash", "go", "rs", "rb", "php"];
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
  if (codeExts.includes(ext)) return "code";
  if (imageExts.includes(ext)) return "image";
  if (mimeType.startsWith("image/")) return "image";
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

const BROWSER_PREVIEW_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "xml",
  "yaml",
  "yml",
  "pdf",
  "svg",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "mp3",
  "wav",
  "ogg",
  "mp4",
  "webm",
  "m4v",
  "html",
  "htm",
  "js",
  "ts",
  "tsx",
  "jsx",
  "css",
  "py",
  "go",
  "rs",
  "java",
  "c",
  "cpp",
  "h",
  "php",
  "rb",
  "sh",
  "sql",
]);

function getFileExtension(value: string | undefined): string {
  if (!value) return "";

  const sanitized = value.split("?")[0].split("#")[0];
  const ext = sanitized.split(".").pop();
  return ext ? ext.toLowerCase() : "";
}

function isPreviewableInBrowser(fileName: string, mimeType?: string): boolean {
  const effectiveMime = typeof mimeType === "string" && mimeType.trim().length > 0
    ? mimeType
    : resolveMimeType({ name: fileName });

  if (
    effectiveMime.startsWith("image/") ||
    effectiveMime.startsWith("text/") ||
    effectiveMime.startsWith("audio/") ||
    effectiveMime.startsWith("video/") ||
    effectiveMime.includes("json") ||
    effectiveMime.includes("pdf") ||
    effectiveMime.includes("xml")
  ) {
    return true;
  }

  const ext = getFileExtension(fileName);
  return BROWSER_PREVIEW_EXTENSIONS.has(ext);
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "attachment";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function tryOpenInNewTab(url: string): boolean {
  try {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    return Boolean(opened);
  } catch {
    return false;
  }
}

function triggerAnchorNavigation(href: string, options?: { downloadName?: string; target?: "_blank" | "_self" }): boolean {
  try {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.rel = "noopener noreferrer";

    if (options?.downloadName) {
      anchor.download = options.downloadName;
    }

    if (options?.target) {
      anchor.target = options.target;
    }

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  } catch {
    return false;
  }
}

function buildFileProxyUrl(sourceUrl: string, fileName: string, disposition: "inline" | "attachment"): string {
  const params = new URLSearchParams();
  params.set("url", sourceUrl);
  params.set("name", fileName || "attachment");
  params.set("disposition", disposition);
  return `/api/file-proxy?${params.toString()}`;
}

async function tryDownloadRemoteUrl(url: string, fileName: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;

    const blob = await response.blob();
    triggerBlobDownload(blob, fileName);
    return true;
  } catch {
    return false;
  }
}

function openInlineDataFile(dataUrl: string, fileName: string): void {
  try {
    const [meta = "", encoded = ""] = dataUrl.split(",", 2);
    const mime = meta.match(/:(.*?);/)?.[1] || "application/octet-stream";
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const blob = new Blob([bytes], { type: mime });
    triggerBlobDownloadOrOpen(blob, fileName);
  } catch (error) {
    console.error("Failed to open inline fallback file:", error);
  }
}

function triggerBlobDownloadOrOpen(blob: Blob, fileName: string): void {
  const effectiveMime = blob.type || resolveMimeType({ name: fileName });

  if (isPreviewableInBrowser(fileName, effectiveMime)) {
    const objectUrl = URL.createObjectURL(blob);
    const opened = tryOpenInNewTab(objectUrl);
    if (opened) {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return;
    }
    URL.revokeObjectURL(objectUrl);
  }

  triggerBlobDownload(blob, fileName);
}

async function triggerFileOpenOrDownload(url: string, fileName: string): Promise<void> {
  const resolvedName = fileName || "attachment";
  const previewable = isPreviewableInBrowser(resolvedName, undefined);

  if (previewable) {
    // For previewable files (PDF, images, text, etc.), try opening in a new tab
    const opened = tryOpenInNewTab(url);
    if (opened) return;

    // Fallback: proxy inline
    const proxyInlineUrl = buildFileProxyUrl(url, resolvedName, "inline");
    const openedProxyInline = tryOpenInNewTab(proxyInlineUrl);
    if (openedProxyInline) return;
  }

  // For non-previewable files (DOCX, etc.) or if preview failed,
  // use anchor-based download which doesn't trigger popup blocker
  const proxyDownloadUrl = buildFileProxyUrl(url, resolvedName, "attachment");
  const viaProxy = triggerAnchorNavigation(proxyDownloadUrl, { downloadName: resolvedName });
  if (viaProxy) return;

  // Last resort: try fetching and triggering blob download
  const downloaded = await tryDownloadRemoteUrl(url, resolvedName);
  if (downloaded) return;

  // Final fallback: direct anchor
  const directDownload = triggerAnchorNavigation(url, { downloadName: resolvedName });
  if (directDownload) return;

  console.error("Failed to trigger hosted file link:", { url, fileName: resolvedName });
}

function isDataUrl(url: string | undefined): boolean {
  return typeof url === "string" && url.startsWith("data:");
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(arr[1]);
  let n = binary.length;
  const bytes = new Uint8Array(n);

  while (n--) {
    bytes[n] = binary.charCodeAt(n);
  }

  return new Blob([bytes], { type: mime });
}

async function attachmentToBlobForDownload(attachment: FileAttachment): Promise<Blob | null> {
  if (!attachment.content) return null;

  if (attachment.content.startsWith("data:")) {
    return dataUrlToBlob(attachment.content);
  }

  return new Blob([attachment.content], {
    type: resolveMimeType({ name: attachment.name, type: attachment.type }),
  });
}

async function attachmentToUploadFile(attachment: FileAttachment): Promise<File | null> {
  if (!attachment.content) return null;

  if (attachment.content.startsWith("data:")) {
    const blob = await dataUrlToBlob(attachment.content);
    return new File([blob], attachment.name || "attachment", {
      type: blob.type || resolveMimeType({ name: attachment.name, type: attachment.type }),
    });
  }

  const mimeType = resolveMimeType({ name: attachment.name, type: attachment.type });
  return new File([attachment.content], attachment.name || "attachment", { type: mimeType });
}

async function uploadBlobForHostedLink(
  blob: Blob,
  fileName: string,
  _token?: string,
  onProgress?: (pct: number) => void
): Promise<UploadedMediaLink | null> {
  try {
    const effectiveType = blob.type || resolveMimeType({ name: fileName });

    if (blob.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error(`"${fileName}" is too large. Keep files under 20MB.`);
    }

    if (!isAllowedUploadFile({ name: fileName, type: effectiveType })) {
      throw new Error(`"${fileName}" is not a supported file type. ${SUPPORTED_UPLOAD_FILES_HINT}`);
    }

    const uploadFile = new File([blob], fileName || "attachment", { type: effectiveType });
    const uploaded = await uploadToCloudinary(uploadFile, onProgress);

    return {
      url: uploaded.secureUrl || uploaded.url,
      name: fileName || uploaded.originalFilename || "attachment",
      provider: "cloudinary",
    };
  } catch (error) {
    console.error("Failed to upload blob for hosted link:", error);
    return null;
  }
}

async function promptForAttachmentFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*/*";
    input.style.position = "fixed";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    input.style.left = "-9999px";
    document.body.appendChild(input);

    let settled = false;

    const cleanup = () => {
      input.removeEventListener("change", handleChange);
      window.removeEventListener("focus", handleWindowFocus);
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };

    const settle = (file: File | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(file);
    };

    const handleChange = () => settle(input.files?.[0] ?? null);

    const handleWindowFocus = () => {
      window.setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) {
          settle(null);
        }
      }, 200);
    };

    input.addEventListener("change", handleChange);
    window.addEventListener("focus", handleWindowFocus, { once: true });
    input.click();
  });
}

async function uploadLegacyDataUrlLink(dataUrl: string, fileName: string, token?: string): Promise<UploadedMediaLink | null> {
  try {
    const blob = await dataUrlToBlob(dataUrl);
    return uploadBlobForHostedLink(blob, fileName || "attachment", token);
  } catch (error) {
    console.error("Failed to migrate legacy data URL link:", error);
    return null;
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
  const { theme } = useTheme();
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [featuresMenuOpen, setFeaturesMenuOpen] = useState(false);
  const [featureWebSearch, setFeatureWebSearch] = useState(false);
  const [featureThinking, setFeatureThinking] = useState(false);
  const [featureStudyMode, setFeatureStudyMode] = useState(false);
  const [featureSummarize, setFeatureSummarize] = useState(false);
  const [featureTranslate, setFeatureTranslate] = useState(false);
  const [featureTranslateLanguage, setFeatureTranslateLanguage] = useState("Arabic");
  const [featureCodeReview, setFeatureCodeReview] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressPct, setUploadProgressPct] = useState(0);
  const [promptTemplates, setPromptTemplates] = useState<string[]>([]);
  const [promptMenuOpen, setPromptMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [runnerDoc, setRunnerDoc] = useState<string | null>(null);

  // Modal state for rename / delete dialogs
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDialogSession, setRenameDialogSession] = useState<ChatSession | null>(null);
  const [renameDialogValue, setRenameDialogValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogSession, setDeleteDialogSession] = useState<ChatSession | null>(null);

  const codeTheme: CodeTheme = theme === "light" ? "oneLight" : "oneDark";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const featuresMenuRef = useRef<HTMLDivElement>(null);
  const promptMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);
  const migratingLegacySessionsRef = useRef<Set<string>>(new Set());
  const skipNextSessionMessagesReloadRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setPromptTemplates([]);
      return () => {
        isMounted = false;
      };
    }

    getUserPromptTemplates(user.uid)
      .then((templates) => {
        if (isMounted) {
          setPromptTemplates(templates);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPromptTemplates([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

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

    if (skipNextSessionMessagesReloadRef.current === sessionId) {
      skipNextSessionMessagesReloadRef.current = null;
      setIsMessagesLoading(false);
      return;
    }

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
    if (!user?.uid || !sessionId || isDraftSessionId(sessionId) || messages.length === 0) return;
    if (migratingLegacySessionsRef.current.has(sessionId)) return;

    const legacyUserMessages = messages.filter(
      (message) =>
        message.role === "user" &&
        ((message.fileLinks && message.fileLinks.some((link) => isDataUrl(link.url))) ||
          (message.imageLinks && message.imageLinks.some((link) => isDataUrl(link.url))))
    );

    if (legacyUserMessages.length === 0) return;

    migratingLegacySessionsRef.current.add(sessionId);

    void (async () => {
      try {
        for (const message of legacyUserMessages) {
          const nextFileLinks: UploadedMediaLink[] = [];
          const nextImageLinks: UploadedMediaLink[] = [];

          for (const link of message.fileLinks || []) {
            if (!isDataUrl(link.url)) {
              nextFileLinks.push(link);
              continue;
            }
            const token = await user.getIdToken();
            const migrated = await uploadLegacyDataUrlLink(link.url, link.name, token);
            if (migrated) nextFileLinks.push(migrated);
          }

          for (const link of message.imageLinks || []) {
            if (!isDataUrl(link.url)) {
              nextImageLinks.push(link);
              continue;
            }
            const imgToken = await user.getIdToken();
            const migrated = await uploadLegacyDataUrlLink(link.url, link.name, imgToken);
            if (migrated) nextImageLinks.push(migrated);
          }

          await updateSessionUserMessageLinks(sessionId, user.uid, message.id, {
            fileLinks: nextFileLinks,
            imageLinks: nextImageLinks,
          });
        }

        const refreshed = await getSessionMessages(sessionId, user.uid);
        setMessages(refreshed);
      } catch (migrationError) {
        console.error("Failed migrating legacy message links:", migrationError);
      } finally {
        migratingLegacySessionsRef.current.delete(sessionId);
      }
    })();
  }, [messages, sessionId, user?.uid, isDraftSessionId]);

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

  useEffect(() => {
    if (!featuresMenuOpen) return;

    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (featuresMenuRef.current?.contains(target)) return;
      setFeaturesMenuOpen(false);
    };

    document.addEventListener("mousedown", handleOutsidePointer);
    document.addEventListener("touchstart", handleOutsidePointer);

    return () => {
      document.removeEventListener("mousedown", handleOutsidePointer);
      document.removeEventListener("touchstart", handleOutsidePointer);
    };
  }, [featuresMenuOpen]);

  useEffect(() => {
    if (!promptMenuOpen && !exportMenuOpen) return;

    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (promptMenuRef.current?.contains(target)) return;
      if (exportMenuRef.current?.contains(target)) return;
      setPromptMenuOpen(false);
      setExportMenuOpen(false);
    };

    document.addEventListener("mousedown", handleOutsidePointer);
    document.addEventListener("touchstart", handleOutsidePointer);

    return () => {
      document.removeEventListener("mousedown", handleOutsidePointer);
      document.removeEventListener("touchstart", handleOutsidePointer);
    };
  }, [promptMenuOpen, exportMenuOpen]);

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
    setRenameDialogSession(session);
    setRenameDialogValue(session.title || "");
    setRenameDialogOpen(true);
  }, [user]);

  const confirmRenameSession = useCallback(async () => {
    if (!user || !renameDialogSession) return;
    const nextName = renameDialogValue.trim();
    if (!nextName) return;
    setRenameDialogOpen(false);
    setChatError(null);
    try {
      const renamedId = await renameChatSession(renameDialogSession.id, nextName, user.uid);
      const shouldKeepSelected = sessionId === renameDialogSession.id;
      await loadSessions(shouldKeepSelected ? renamedId : null);
      if (shouldKeepSelected) setSessionId(renamedId);
    } catch (error) {
      console.error("Failed to rename chat:", error);
      setChatError(getErrorMessage(error, "Could not rename this chat."));
    } finally {
      setRenameDialogSession(null);
      setRenameDialogValue("");
    }
  }, [user, sessionId, loadSessions, renameDialogSession, renameDialogValue]);

  const handleArchiveSession = useCallback(async (session: ChatSession) => {
    if (!user) return;
    setChatError(null);

    const previousSessions = sessions;
    const previousArchivedSessions = archivedSessions;
    const wasActive = sessionId === session.id;
    const remainingSessions = sessions.filter((candidate) => candidate.id !== session.id);
    const fallbackSessionId = wasActive ? (remainingSessions[0]?.id ?? null) : sessionId;
    const archivedCopy: ChatSession = {
      ...session,
      isArchived: true,
      updatedAt: new Date(),
    };

    setSessions(remainingSessions);
    setArchivedSessions((prev) => sortSessionsByUpdatedAt([archivedCopy, ...prev.filter((candidate) => candidate.id !== session.id)]));

    if (wasActive) {
      setSessionId(fallbackSessionId);
      if (!fallbackSessionId) {
        setMessages([]);
      }
    }

    try {
      await archiveChatSession(session.id, user.uid);
    } catch (error) {
      console.error("Failed to archive chat:", error);
      setSessions(previousSessions);
      setArchivedSessions(previousArchivedSessions);
      if (wasActive) {
        setSessionId(session.id);
      }
      setChatError(getErrorMessage(error, "Could not archive this chat."));
    }
  }, [user, sessionId, sessions, archivedSessions]);

  const handleRestoreArchivedSession = useCallback(async (session: ChatSession) => {
    if (!user) return;
    setChatError(null);

    const previousSessions = sessions;
    const previousArchivedSessions = archivedSessions;
    const restoredSession: ChatSession = {
      ...session,
      isArchived: false,
      updatedAt: new Date(),
    };

    setArchivedSessions((prev) => prev.filter((candidate) => candidate.id !== session.id));
    setSessions((prev) => sortSessionsByUpdatedAt([restoredSession, ...prev.filter((candidate) => candidate.id !== session.id)]));
    setSessionId(session.id);

    try {
      await restoreArchivedChatSession(session.id, user.uid);
    } catch (error) {
      console.error("Failed to restore archived chat:", error);
      setSessions(previousSessions);
      setArchivedSessions(previousArchivedSessions);
      setChatError(getErrorMessage(error, "Could not restore this archived chat."));
    }
  }, [user, sessions, archivedSessions]);

  const handleDeleteSession = useCallback(async (session: ChatSession) => {
    if (!user) return;
    setDeleteDialogSession(session);
    setDeleteDialogOpen(true);
  }, [user]);

  const confirmDeleteSession = useCallback(async () => {
    if (!user || !deleteDialogSession) return;
    const session = deleteDialogSession;
    setDeleteDialogOpen(false);
    setDeleteDialogSession(null);
    setChatError(null);

    const previousSessions = sessions;
    const previousArchivedSessions = archivedSessions;
    const previousDraftSession = draftSession;
    const wasActive = sessionId === session.id;
    const remainingSessions = sessions.filter((candidate) => candidate.id !== session.id);
    const fallbackSessionId = wasActive ? (remainingSessions[0]?.id ?? null) : sessionId;

    setSessions((prev) => prev.filter((candidate) => candidate.id !== session.id));
    setArchivedSessions((prev) => prev.filter((candidate) => candidate.id !== session.id));
    if (draftSession?.id === session.id) {
      setDraftSession(null);
    }

    if (wasActive) {
      setSessionId(fallbackSessionId);
      if (!fallbackSessionId) {
        setMessages([]);
      }
    }

    try {
      await deleteChatSession(session.id, user.uid);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      setSessions(previousSessions);
      setArchivedSessions(previousArchivedSessions);
      setDraftSession(previousDraftSession);
      if (wasActive) {
        setSessionId(session.id);
      }
      setChatError(getErrorMessage(error, "Could not delete this chat."));
    }
  }, [user, sessionId, draftSession, sessions, archivedSessions, deleteDialogSession]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    setChatError(null);
    const availableSlots = Math.max(MAX_ATTACHMENTS_PER_MESSAGE - attachments.length, 0);

    if (availableSlots === 0) {
      setChatError(`Free OpenRouter mode allows up to ${MAX_ATTACHMENTS_PER_MESSAGE} file per message. Remove an attachment to add another.`);
      return;
    }

    const selectedFiles = Array.from(files);
    const filesToProcess = selectedFiles.slice(0, availableSlots);
    if (selectedFiles.length > filesToProcess.length) {
      setChatError(`Only ${MAX_ATTACHMENTS_PER_MESSAGE} file is allowed per message in free mode.`);
    }

    const newAttachments: FileAttachment[] = [];
    for (const file of filesToProcess) {
      try {
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          setChatError(`"${file.name}" is too large. Keep files under 20MB.`);
          continue;
        }

        if (!isAllowedUploadFile(file)) {
          setChatError(`"${file.name}" is not a supported file type. ${SUPPORTED_UPLOAD_FILES_HINT}`);
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
          type: resolveMimeType(file),
          size: file.size, content, preview,
        });
      } catch (fileError) {
        console.error(`Failed to process attachment ${file.name}:`, fileError);
        setChatError(`Could not attach "${file.name}". Try a different file.`);
      }
    }
    if (newAttachments.length > 0) setAttachments((prev) => [...prev, ...newAttachments]);
  }, [attachments.length]);

  const removeAttachment = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) void handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setIsDragging(false); }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      imageFiles.forEach((f) => dt.items.add(f));
      void handleFileUpload(dt.files);
    }
  }, [handleFileUpload]);

  const slashQuery = useMemo(() => {
    const trimmed = input.trimStart();
    if (!trimmed.startsWith("/")) return "";
    return trimmed.slice(1).toLowerCase();
  }, [input]);

  const slashSuggestions = useMemo(() => {
    if (!slashQuery) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((item) => item.command.includes(slashQuery));
  }, [slashQuery]);

  const extractLastCodeBlock = useCallback(() => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (!message?.content) continue;

      const matches = Array.from(message.content.matchAll(codeBlockRegex));
      if (matches.length > 0) {
        const latest = matches[matches.length - 1];
        return {
          language: (latest[1] || "text").toLowerCase(),
          code: latest[2] || "",
        };
      }
    }

    return null;
  }, [messages]);

  const resolveSlashPrompt = useCallback((rawInput: string) => {
    if (!rawInput.trim().startsWith("/")) {
      return {
        prompt: rawInput,
        useWebSearch: false,
        translateTarget: undefined as string | undefined,
      };
    }

    const [commandRaw, ...args] = rawInput.trim().slice(1).split(/\s+/);
    const command = commandRaw.toLowerCase();
    const joinedArgs = args.join(" ").trim();

    if (command === "search") {
      return {
        prompt: `Search the web and provide a concise answer with sources for: ${joinedArgs}`,
        useWebSearch: true,
        translateTarget: undefined,
      };
    }

    if (command === "analyze") {
      return {
        prompt: `Analyze this GitHub repository in depth and report architecture, risks, and recommendations: ${joinedArgs}`,
        useWebSearch: false,
        translateTarget: undefined,
      };
    }

    if (command === "translate") {
      const [source = "", target = "", ...rest] = args;
      const providedCode = rest.join(" ").trim();
      const fallback = extractLastCodeBlock();
      const codeToUse = providedCode || fallback?.code || "";
      if (!source || !target || !codeToUse) {
        return { error: "Usage: /translate <source> <target> <code> or include a recent code block." };
      }
      return {
        prompt: `Translate this ${source} code to ${target}. Keep behavior equivalent and preserve readability:\n\n${codeToUse}`,
        useWebSearch: false,
        translateTarget: target,
      };
    }

    if (["review", "commit", "explain", "simplify"].includes(command)) {
      const fallback = extractLastCodeBlock();
      if (!fallback?.code) {
        return { error: `/${command} needs a code block in recent chat history.` };
      }

      const prompts: Record<string, string> = {
        review: "Review this code for bugs, security issues, and performance problems:",
        commit: "Generate a concise commit message for this code change:",
        explain: "Explain this code step by step:",
        simplify: "Refactor this code to be simpler while preserving behavior:",
      };

      return {
        prompt: `${prompts[command]}\n\n${fallback.code}`,
        useWebSearch: false,
        translateTarget: undefined,
      };
    }

    return { error: `Unknown slash command: /${command}` };
  }, [extractLastCodeBlock]);

  const exportAsMarkdown = useCallback(() => {
    const markdown = messages
      .map((message) => `## ${message.role === "user" ? "User" : "Assistant"}\n\n${message.content}\n`)
      .join("\n");

    const blob = new Blob([markdown], { type: "text/markdown" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "chat-export.md";
    link.click();
    URL.revokeObjectURL(link.href);
  }, [messages]);

  const exportAsJson = useCallback(() => {
    const payload = messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
    }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "chat-export.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }, [messages]);

  const exportAsPdf = useCallback(() => {
    const html = messages
      .map((message) => `<h3>${message.role === "user" ? "User" : "Assistant"}</h3><pre style=\"white-space:pre-wrap;font-family:system-ui\">${message.content.replace(/</g, "&lt;")}</pre>`)
      .join("<hr />");

    const popup = window.open("", "_blank", "width=960,height=720");
    if (!popup) return;
    popup.document.write(`<html><head><title>Chat Export</title></head><body>${html}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }, [messages]);

  const saveCustomTemplate = useCallback(async () => {
    if (!user) {
      setChatError("Please sign in to save custom templates.");
      return;
    }

    const trimmed = input.trim();
    if (!trimmed) return;

    try {
      const next = await saveUserPromptTemplate(user.uid, trimmed);
      setPromptTemplates(next);
    } catch (error) {
      setChatError(getErrorMessage(error, "Could not save the template."));
    }
  }, [input, user]);

  const shareCurrentChat = useCallback(async () => {
    if (!user) {
      setChatError("Please sign in to share a chat.");
      return;
    }
    if (messages.length === 0) {
      setChatError("There is no chat content to share yet.");
      return;
    }

    try {
      const sessionTitle =
        sessions.find((session) => session.id === sessionId)?.title ||
        archivedSessions.find((session) => session.id === sessionId)?.title ||
        "Shared Chat";

      const shareId = await createSharedChat(user.uid, sessionTitle, messages);
      const shareUrl = `${window.location.origin}/shared-chat/${shareId}`;
      await navigator.clipboard.writeText(shareUrl);
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setChatError(getErrorMessage(error, "Unable to create a share link."));
    }
  }, [archivedSessions, messages, sessionId, sessions, user]);

  const sendCodeToPlayground = useCallback((language: string, value: string) => {
    const normalized = language.toLowerCase();
    const state = {
      html: normalized === "html" ? value : "<main id=\"app\"></main>",
      css: "",
      js: normalized === "javascript" || normalized === "js" || normalized === "typescript" || normalized === "ts" ? value : "",
    };

    const hash = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    window.open(`/tools/playground#${hash}`, "_blank");
  }, []);

  const handleLegacyFileLinkClick = useCallback(async (message: ChatMessage, link: UploadedMediaLink) => {
    if (!isDataUrl(link.url)) {
      await triggerFileOpenOrDownload(link.url, link.name);
      return;
    }

    if (!sessionId || !user?.uid || isDraftSessionId(sessionId)) {
      openInlineDataFile(link.url, link.name);
      return;
    }

    const migrateToken = await user.getIdToken();
    const migrated = await uploadLegacyDataUrlLink(link.url, link.name, migrateToken);
    if (!migrated) {
      openInlineDataFile(link.url, link.name);
      return;
    }

    const nextFileLinks = (message.fileLinks || []).map((candidate) =>
      candidate.url === link.url && candidate.name === link.name ? migrated : candidate
    );
    const nextImageLinks = (message.imageLinks || []).map((candidate) =>
      candidate.url === link.url && candidate.name === link.name ? migrated : candidate
    );

    setMessages((prev) =>
      prev.map((candidate) =>
        candidate.id === message.id
          ? {
              ...candidate,
              fileLinks: nextFileLinks,
              imageLinks: nextImageLinks,
            }
          : candidate
      )
    );

    try {
      await updateSessionUserMessageLinks(sessionId, user.uid, message.id, {
        fileLinks: nextFileLinks,
        imageLinks: nextImageLinks,
      });
    } catch (error) {
      console.error("Failed to persist migrated file link:", error);
    }

    await triggerFileOpenOrDownload(migrated.url, migrated.name || link.name);
  }, [sessionId, user?.uid, isDraftSessionId]);

  const handleAttachmentFallbackClick = useCallback(async (message: ChatMessage, attachment: FileAttachment) => {
    setChatError(null);

    try {
      const blob = await attachmentToBlobForDownload(attachment);

      if (!blob) {
        // No local content available — try to re-create from attachment name/type
        console.warn(`No local content for "${attachment.name}"`);
        return;
      }

      // Open/download from local blob directly
      triggerBlobDownloadOrOpen(blob, attachment.name);

      // Attempt to create a hosted link in the background for future access
      const dlToken = await user?.getIdToken();
      const hostedLink = await uploadBlobForHostedLink(blob, attachment.name, dlToken);

      if (hostedLink) {
        const existingFileLinks = message.fileLinks || [];
        const nextFileLinks = [
          ...existingFileLinks.filter((candidate) => candidate.url !== hostedLink.url),
          hostedLink,
        ];

        setMessages((prev) =>
          prev.map((candidate) =>
            candidate.id === message.id
              ? { ...candidate, fileLinks: nextFileLinks }
              : candidate
          )
        );

        if (sessionId && user?.uid && !isDraftSessionId(sessionId)) {
          try {
            await updateSessionUserMessageLinks(sessionId, user.uid, message.id, {
              fileLinks: nextFileLinks,
            });
          } catch (persistError) {
            console.error("Failed to persist recovered file link:", persistError);
          }
        }
      }
    } catch (error) {
      console.error("Failed to open local attachment fallback:", error);
    }
  }, [sessionId, user?.uid, isDraftSessionId]);

  const openRunner = useCallback((language: string, value: string) => {
    const normalized = language.toLowerCase();
    if (!["javascript", "js", "typescript", "ts", "html"].includes(normalized)) return;

    const runnerHtml =
      normalized === "html"
        ? value
        : `<!doctype html><html><body><pre id=\"out\"></pre><script>\nconst print=(...args)=>{document.getElementById('out').textContent += args.map(String).join(' ') + '\\n'};\nconsole.log=print;\ntry{\n${value}\n}catch(e){print('Error:', e?.message || e);}\n<\/script></body></html>`;

    setRunnerDoc(runnerHtml);
  }, []);

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading || !user) return;
    if (sessionId && archivedSessions.some((s) => s.id === sessionId)) {
      setChatError("This chat is archived. Restore it before sending new messages.");
      return;
    }

    if (attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      setChatError(`Please keep attachments to ${MAX_ATTACHMENTS_PER_MESSAGE} file per message in free mode.`);
      return;
    }

    setChatError(null);

    const trimmedInput = input.trim();
    const slashResolved = resolveSlashPrompt(trimmedInput);
    if ("error" in slashResolved) {
      setChatError(slashResolved.error || "Invalid slash command");
      return;
    }

    const normalizedPrompt =
      slashResolved.prompt.trim() || (attachments.length > 0 ? "Please analyze the attached file(s)." : "");
    const historyForModel = messages.slice(-10);
    let modelUsedForExchange = selectedModel;
    const needsNewSession = !sessionId || isDraftSessionId(sessionId);

    // Upload attachments directly to Cloudinary from the browser.
    let uploadedImageLinks: UploadedMediaLink[] = [];
    let uploadedFileLinks: UploadedMediaLink[] = [];

    if (attachments.length > 0) {
      setIsUploading(true);
      setUploadProgressPct(0);
      try {
        const totalUploadBytes = attachments.reduce(
          (sum, attachment) => sum + Math.max(attachment.size, 1),
          0
        );
        let uploadedBytes = 0;

        for (const attachment of attachments) {
          if (attachment.size > MAX_ATTACHMENT_SIZE_BYTES) {
            throw new Error(`"${attachment.name}" is too large. Keep files under 20MB.`);
          }

          if (!isAllowedUploadFile({ name: attachment.name, type: attachment.type })) {
            throw new Error(`"${attachment.name}" is not a supported file type. ${SUPPORTED_UPLOAD_FILES_HINT}`);
          }

          const uploadFile = await attachmentToUploadFile(attachment);
          if (!uploadFile) {
            throw new Error(`"${attachment.name}" has no readable content to upload.`);
          }

          const uploadSize = Math.max(uploadFile.size || attachment.size, 1);
          const uploaded = await uploadToCloudinary(uploadFile, (pct) => {
            if (totalUploadBytes <= 0) return;
            const currentFileBytes = Math.round((uploadSize * pct) / 100);
            const overallBytes = Math.min(uploadedBytes + currentFileBytes, totalUploadBytes);
            setUploadProgressPct(Math.round((overallBytes / totalUploadBytes) * 100));
          });

          const nextLink: UploadedMediaLink = {
            url: uploaded.secureUrl || uploaded.url,
            name: attachment.name,
            provider: "cloudinary",
          };

          if (getFileType({ name: attachment.name, type: attachment.type }) === "image") {
            uploadedImageLinks.push(nextLink);
          } else {
            uploadedFileLinks.push(nextLink);
          }

          uploadedBytes += uploadSize;
          if (totalUploadBytes > 0) {
            setUploadProgressPct(Math.round((uploadedBytes / totalUploadBytes) * 100));
          }
        }
      } catch (uploadErr) {
        console.error('[Upload] FAILED:', uploadErr);
        setChatError(`File upload failed: ${uploadErr instanceof Error ? uploadErr.message : 'unknown error'}`);
        setIsUploading(false);
        setUploadProgressPct(0);
        setIsLoading(false);
        return; // ABORT — do not send message with no links
      } finally {
        setIsUploading(false);
        setUploadProgressPct(0);
      }
    }

    if (attachments.length > 0) {
      console.info('[Upload] Final counts — imageLinks:', uploadedImageLinks.length, 'fileLinks:', uploadedFileLinks.length,
        'providers:', [...uploadedImageLinks, ...uploadedFileLinks].map(l => l.provider).join(',') || 'none');
    }

    const userMessage: ChatMessage = {
      id: generateId(), role: "user", content: normalizedPrompt,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      imageLinks: uploadedImageLinks.length > 0 ? uploadedImageLinks : undefined,
      fileLinks: uploadedFileLinks.length > 0 ? uploadedFileLinks : undefined,
    };
    const assistantId = generateId();

    // Show messages and start loading IMMEDIATELY — no Firestore blocking
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date(), isStreaming: true },
    ]);
    setInput(""); setAttachments([]); setIsLoading(true);

    try {
      // Fire the API call INSTANTLY
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          attachments: userMessage.attachments,
          history: historyForModel,
          model: selectedModel,
          features: {
            webSearch: featureWebSearch || slashResolved.useWebSearch,
            thinking: featureThinking,
            studyMode: featureStudyMode,
            summarize: featureSummarize,
            translate: slashResolved.translateTarget || (featureTranslate ? featureTranslateLanguage : undefined),
            codeReview: featureCodeReview,
          },
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

      // NOW persist to Firestore in the background (after AI responded)
      persistExchange(user, needsNewSession, normalizedPrompt, userMessage, assistantMessage, modelUsedForExchange);
    } catch (error) {
      console.error("Chat error:", error);
      const fallbackText = error instanceof Error
        ? `Sorry, I encountered an error: ${error.message}`
        : "Sorry, I encountered an error. Please try again.";

      const errorAssistantMessage: ChatMessage = {
        id: assistantId, role: "assistant", content: fallbackText,
        timestamp: new Date(), error: error instanceof Error ? error.message : "Unknown error", isStreaming: false,
      };

      setMessages((prev) => prev.map((m) => m.id === assistantId
        ? { ...m, content: fallbackText, isStreaming: false, error: errorAssistantMessage.error, timestamp: new Date() }
        : m
      ));

      // Persist error exchange in background
      persistExchange(user, needsNewSession, normalizedPrompt, userMessage, errorAssistantMessage, modelUsedForExchange);
    } finally {
      setIsLoading(false);
    }
  };

  // Background Firestore persistence — never blocks the UI
  const persistExchange = async (
    currentUser: NonNullable<typeof user>,
    needsNewSession: boolean,
    sessionTitle: string,
    userMsg: ChatMessage,
    assistantMsg: ChatMessage,
    model: string
  ) => {
    try {
      let targetSessionId = sessionId;

      if (needsNewSession) {
        try {
          await currentUser.getIdToken(true);
          targetSessionId = await createChatSession(currentUser.uid, sessionTitle || "New Chat", model, currentUser.email);
        } catch (sessionError) {
          console.error("Background session creation failed:", sessionError);
          return; // Silently fail — user already has their AI response
        }
      }

      if (targetSessionId && !targetSessionId.startsWith(DRAFT_CHAT_ID_PREFIX)) {
        // IMPORTANT: Save exchange BEFORE changing sessionId.
        // Changing sessionId triggers a useEffect that re-fetches messages from Firestore.
        // If we set sessionId first, the useEffect reads empty data and wipes local messages.
        await saveChatExchange(targetSessionId, currentUser.uid, userMsg, assistantMsg, model, currentUser.email);

        // NOW safe to update the session ID — messages are already in Firestore
        const exchangeTimestamp = assistantMsg.timestamp instanceof Date
          ? assistantMsg.timestamp
          : new Date(assistantMsg.timestamp);

        const optimisticMessageDelta = 2;

        if (needsNewSession) {
          setDraftSession(null);
          setSessions((prev) => {
            const base = prev.filter((s) => !s.isDraft && s.id !== targetSessionId);
            const createdSession: ChatSession = {
              id: targetSessionId,
              userId: currentUser.uid,
              userEmail: currentUser.email ?? undefined,
              title: targetSessionId,
              model,
              createdAt: exchangeTimestamp,
              updatedAt: exchangeTimestamp,
              messageCount: optimisticMessageDelta,
              isArchived: false,
            };
            return sortSessionsByUpdatedAt([createdSession, ...base]);
          });
          skipNextSessionMessagesReloadRef.current = targetSessionId;
          setSessionId(targetSessionId);
        } else {
          setSessions((prev) =>
            sortSessionsByUpdatedAt(
              prev.map((s) =>
                s.id === targetSessionId
                  ? {
                      ...s,
                      model,
                      updatedAt: exchangeTimestamp,
                      messageCount: (s.messageCount || 0) + optimisticMessageDelta,
                    }
                  : s
              )
            )
          );
        }
      }
    } catch (persistError) {
      console.error("Background persist failed:", persistError);
      // Don't show errors for background persistence — the user already has their answer
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

  // Shared sidebar content renderer
  const renderSidebarContent = () => (
    <>
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-border/40">
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2 h-9 justify-center border-border/50 bg-background/50 hover:bg-accent/60 transition-all duration-200"
          onClick={() => { void handleCreateNewChat(); setMobileSidebarOpen(false); }}
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
                        onClick={() => { setChatError(null); if (draftSession && session.id !== draftSession.id) { setDraftSession(null); setSessions((prev) => prev.filter((s) => !s.isDraft)); } setSessionId(session.id); setMobileSidebarOpen(false); }}
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
                          onClick={() => { setChatError(null); if (draftSession) { setDraftSession(null); setSessions((prev) => prev.filter((s) => !s.isDraft)); } setSessionId(session.id); setMobileSidebarOpen(false); }}
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
    </>
  );

  return (
    <div
      className="relative flex h-[calc(100vh-7rem)] w-full overflow-hidden bg-background"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Drag-and-drop overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary/50 rounded-2xl m-2"
          >
            <div className="text-center">
              <Paperclip className="h-10 w-10 text-primary/60 mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground/80">Drop files here</p>
              <p className="text-sm text-muted-foreground/60">Images, code, PDFs, and more</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-[30%] w-[600px] h-[400px] bg-primary/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-[20%] w-[500px] h-[300px] bg-blue-400/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* ─── Mobile Sidebar Drawer ──────────────── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[300px] flex flex-col border-r border-border/50 bg-card/95 backdrop-blur-xl md:hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-border/40">
                <span className="text-sm font-medium text-foreground/80">Chats</span>
                <button onClick={() => setMobileSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── Desktop Sidebar ──────────────────────── */}
      <aside className="relative hidden md:flex md:w-[280px] md:flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm">
        {renderSidebarContent()}
      </aside>

      {/* ─── Main Chat Panel ──────────────────────── */}
      <div className="relative flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="md:hidden p-3 border-b border-border/40 flex items-center justify-between bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground shrink-0"
            >
              <Menu className="h-4 w-4" />
            </button>
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
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLast={idx === messages.length - 1}
                  codeTheme={codeTheme}
                  onRunCode={openRunner}
                  onSendToPlayground={sendCodeToPlayground}
                  onLegacyFileLinkClick={handleLegacyFileLinkClick}
                  onAttachmentFallbackClick={handleAttachmentFallbackClick}
                />
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
                    <div className="px-4 pt-3 flex flex-wrap gap-2">
                      {attachments.map((attachment) => {
                        const fileType = getFileType({ name: attachment.name, type: attachment.type });
                        const isImage = fileType === "image";

                        return isImage && attachment.preview ? (
                          <div key={attachment.id} className="relative group">
                            <button
                              type="button"
                              onClick={() => setLightboxImage(attachment.preview || null)}
                              className="block rounded-lg overflow-hidden border border-border/40 hover:border-primary/40 transition-all duration-200"
                            >
                              <img
                                src={attachment.preview}
                                alt={attachment.name}
                                className="h-20 w-20 object-cover"
                              />
                            </button>
                            <button
                              onClick={() => removeAttachment(attachment.id)}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <p className="text-[10px] text-muted-foreground/60 truncate max-w-[80px] mt-0.5 text-center">{attachment.name}</p>
                          </div>
                        ) : (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/60 rounded-lg text-xs"
                          >
                            <FileIcon type={fileType} />
                            <span className="max-w-[140px] truncate text-muted-foreground">{attachment.name}</span>
                            <button onClick={() => removeAttachment(attachment.id)} className="hover:text-destructive transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input area */}
              <AnimatePresence>
                {input.trimStart().startsWith("/") && slashSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="px-3 pt-3"
                  >
                    <div className="rounded-xl border border-border/50 bg-background/80 max-h-[180px] overflow-auto">
                      {slashSuggestions.map((item) => (
                        <button
                          key={item.command}
                          type="button"
                          onClick={() => {
                            setInput(`/${item.command} `);
                            textareaRef.current?.focus();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-accent/50 border-b border-border/30 last:border-b-0"
                        >
                          <p className="text-sm font-mono">/{item.command}</p>
                          <p className="text-xs text-muted-foreground">{item.description} · {item.usage}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2 p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    void handleFileUpload(files);
                    e.currentTarget.value = "";
                  }}
                />

                <div ref={featuresMenuRef} className="relative">
                  <button
                    onClick={() => setFeaturesMenuOpen(!featuresMenuOpen)}
                    disabled={isLoading}
                    className={cn(
                      "p-2 rounded-lg transition-all duration-150 disabled:opacity-40",
                      featuresMenuOpen || featureWebSearch || featureThinking || featureStudyMode || featureSummarize || featureTranslate || featureCodeReview
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground/60 hover:text-foreground hover:bg-accent/50"
                    )}
                    title="AI Features"
                  >
                    <Plus className="h-4.5 w-4.5" />
                  </button>

                  <AnimatePresence>
                    {featuresMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-0 mb-2 w-[240px] z-50 rounded-xl border border-border/50 bg-popover p-1 shadow-xl outline-none"
                      >
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            AI Abilities
                          </div>
                          
                          <button
                            onClick={() => setFeatureWebSearch(!featureWebSearch)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Globe className={cn("h-4 w-4", featureWebSearch ? "text-blue-500" : "text-muted-foreground")} />
                              <span className={featureWebSearch ? "font-medium" : ""}>Web Search</span>
                            </div>
                            {featureWebSearch && <Check className="h-4 w-4 text-blue-500" />}
                          </button>
                          
                          <button
                            onClick={() => setFeatureThinking(!featureThinking)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Brain className={cn("h-4 w-4", featureThinking ? "text-purple-500" : "text-muted-foreground")} />
                              <span className={featureThinking ? "font-medium" : ""}>Extended Thinking</span>
                            </div>
                            {featureThinking && <Check className="h-4 w-4 text-purple-500" />}
                          </button>
                          
                          <button
                            onClick={() => setFeatureStudyMode(!featureStudyMode)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <GraduationCap className={cn("h-4 w-4", featureStudyMode ? "text-green-500" : "text-muted-foreground")} />
                              <span className={featureStudyMode ? "font-medium" : ""}>Study Mode</span>
                            </div>
                            {featureStudyMode && <Check className="h-4 w-4 text-green-500" />}
                          </button>

                          <div className="mx-1.5 my-1 border-t border-border/30" />
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                            Response Modes
                          </div>

                          <button
                            onClick={() => setFeatureSummarize(!featureSummarize)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Zap className={cn("h-4 w-4", featureSummarize ? "text-amber-500" : "text-muted-foreground")} />
                              <span className={featureSummarize ? "font-medium" : ""}>Summarize</span>
                            </div>
                            {featureSummarize && <Check className="h-4 w-4 text-amber-500" />}
                          </button>

                          <button
                            onClick={() => setFeatureTranslate(!featureTranslate)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Languages className={cn("h-4 w-4", featureTranslate ? "text-cyan-500" : "text-muted-foreground")} />
                              <span className={featureTranslate ? "font-medium" : ""}>Translate</span>
                            </div>
                            {featureTranslate && <Check className="h-4 w-4 text-cyan-500" />}
                          </button>

                          {featureTranslate && (
                            <div className="px-2 pb-1">
                              <select
                                value={featureTranslateLanguage}
                                onChange={(e) => setFeatureTranslateLanguage(e.target.value)}
                                className="w-full text-xs px-2 py-1.5 rounded-md bg-background/80 border border-border/50 text-foreground"
                              >
                                {["Arabic", "Spanish", "French", "German", "Chinese", "Japanese", "Korean", "Portuguese", "Russian", "Italian", "Hindi", "Turkish", "Dutch", "Polish"].map((lang) => (
                                  <option key={lang} value={lang}>{lang}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <button
                            onClick={() => setFeatureCodeReview(!featureCodeReview)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Code2 className={cn("h-4 w-4", featureCodeReview ? "text-rose-500" : "text-muted-foreground")} />
                              <span className={featureCodeReview ? "font-medium" : ""}>Code Review</span>
                            </div>
                            {featureCodeReview && <Check className="h-4 w-4 text-rose-500" />}
                          </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div ref={promptMenuRef} className="relative">
                  <button
                    onClick={() => setPromptMenuOpen((prev) => !prev)}
                    disabled={isLoading}
                    className="p-2 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-all duration-150 disabled:opacity-40"
                    title="Prompt templates"
                  >
                    <BookOpen className="h-4.5 w-4.5" />
                  </button>

                  <AnimatePresence>
                    {promptMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        className="absolute bottom-full left-0 mb-2 w-[300px] max-h-[280px] overflow-auto rounded-xl border border-border/50 bg-popover p-2 shadow-xl z-50"
                      >
                        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prompt templates</p>
                        {[...BUILT_IN_PROMPT_TEMPLATES, ...promptTemplates].map((template, index) => (
                          <button
                            key={`${template}-${index}`}
                            type="button"
                            className="w-full text-left rounded-md px-2 py-2 hover:bg-accent/60 text-xs"
                            onClick={() => {
                              setInput(template);
                              setPromptMenuOpen(false);
                              textareaRef.current?.focus();
                            }}
                          >
                            {template}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="mt-1 w-full rounded-md border px-2 py-1.5 text-xs hover:bg-accent"
                          onClick={() => {
                            void saveCustomTemplate();
                            setPromptMenuOpen(false);
                          }}
                        >
                          Save current input as template
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

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
                  onPaste={handlePaste}
                  onFocus={() => setComposerFocused(true)}
                  onBlur={() => setComposerFocused(false)}
                  placeholder={featureStudyMode ? "Ask a question, request a summary, or type 'Quiz me'…" : "Ask me anything, paste an image, or drag files…"}
                  className="flex-1 min-h-[40px] max-h-[200px] resize-none bg-transparent outline-none ring-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-none text-sm md:text-base placeholder:text-muted-foreground/40 py-2.5"
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

                <div ref={exportMenuRef} className="relative">
                  <button
                    onClick={() => setExportMenuOpen((prev) => !prev)}
                    disabled={isLoading || messages.length === 0}
                    className="p-2 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-accent/50 transition-all duration-150 disabled:opacity-40"
                    title="Export chat"
                  >
                    <Download className="h-4.5 w-4.5" />
                  </button>
                  <AnimatePresence>
                    {exportMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        className="absolute bottom-full right-0 mb-2 w-[180px] rounded-xl border border-border/50 bg-popover p-2 shadow-xl z-50"
                      >
                        <button type="button" className="w-full text-left rounded-md px-2 py-2 hover:bg-accent/60 text-xs" onClick={() => { exportAsMarkdown(); setExportMenuOpen(false); }}>
                          Export Markdown
                        </button>
                        <button type="button" className="w-full text-left rounded-md px-2 py-2 hover:bg-accent/60 text-xs" onClick={() => { exportAsJson(); setExportMenuOpen(false); }}>
                          Export JSON
                        </button>
                        <button type="button" className="w-full text-left rounded-md px-2 py-2 hover:bg-accent/60 text-xs" onClick={() => { exportAsPdf(); setExportMenuOpen(false); }}>
                          Export PDF
                        </button>
                        <button type="button" className="w-full text-left rounded-md px-2 py-2 hover:bg-accent/60 text-xs" onClick={() => { void shareCurrentChat(); setExportMenuOpen(false); }}>
                          Share Link
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-4 pb-2.5 pt-0">
                <div className="flex items-center gap-2">
                  <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} disabled={isLoading} />
                  
                  {/* Active features indicators */}
                  <div className="hidden sm:flex items-center gap-1.5 ml-1">
                    {featureWebSearch && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        <Globe className="h-3 w-3" /> Search
                      </span>
                    )}
                    {featureThinking && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20">
                        <Brain className="h-3 w-3" /> Think
                      </span>
                    )}
                    {featureStudyMode && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                        <GraduationCap className="h-3 w-3" /> Study Mode
                      </span>
                    )}
                    {featureSummarize && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Zap className="h-3 w-3" /> Summarize
                      </span>
                    )}
                    {featureTranslate && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                        <Languages className="h-3 w-3" /> {featureTranslateLanguage}
                      </span>
                    )}
                    {featureCodeReview && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        <Code2 className="h-3 w-3" /> Review
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isUploading && (
                    <span className="text-[10px] text-primary/60 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Uploading {uploadProgressPct}%
                    </span>
                  )}
                  <p className="text-[10px] text-muted-foreground/40 hidden sm:block">Shift+Enter for new line</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Lightbox Image Preview ──────────────── */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage}
                alt="Preview"
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-background/90 border border-border/50 flex items-center justify-center text-foreground hover:bg-background transition-colors shadow-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Code Runner Modal ────────────────────── */}
      <AnimatePresence>
        {runnerDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setRunnerDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-4xl bg-background border border-border/60 rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                <p className="text-sm font-medium">Code Runner (sandboxed iframe)</p>
                <button onClick={() => setRunnerDoc(null)} className="p-1 rounded hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <iframe title="Code runner" sandbox="allow-scripts" srcDoc={runnerDoc} className="w-full h-[460px] bg-white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Rename Chat Dialog ────────────────────── */}
      <Dialog open={renameDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setRenameDialogOpen(false);
          setRenameDialogSession(null);
          setRenameDialogValue("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>Enter a new name for this chat session.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameDialogValue}
            onChange={(e) => setRenameDialogValue(e.target.value)}
            placeholder="Chat name"
            onKeyDown={(e) => { if (e.key === "Enter") confirmRenameSession(); }}
            autoFocus
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => {
              setRenameDialogOpen(false);
              setRenameDialogSession(null);
              setRenameDialogValue("");
            }}>
              Cancel
            </Button>
            <Button onClick={confirmRenameSession} disabled={!renameDialogValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Chat Confirmation ────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialogOpen(false);
          setDeleteDialogSession(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteDialogSession?.title || "this chat"}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteDialogSession(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function MessageBubble({
  message,
  isLast,
  codeTheme,
  onRunCode,
  onSendToPlayground,
  onLegacyFileLinkClick,
  onAttachmentFallbackClick,
}: {
  message: ChatMessage;
  isLast?: boolean;
  codeTheme: CodeTheme;
  onRunCode: (language: string, value: string) => void;
  onSendToPlayground: (language: string, value: string) => void;
  onLegacyFileLinkClick: (message: ChatMessage, link: UploadedMediaLink) => Promise<void>;
  onAttachmentFallbackClick: (message: ChatMessage, attachment: FileAttachment) => Promise<void>;
}) {
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
        {/* Uploaded Image Previews */}
        {message.imageLinks && message.imageLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.imageLinks.map((link, i) => (
              <a
                key={`img-${i}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden border border-border/40 hover:border-primary/40 transition-all duration-200 group relative"
              >
                <img
                  src={link.url}
                  alt={link.name}
                  className="h-24 w-24 sm:h-32 sm:w-32 object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
                <p className="text-[9px] text-muted-foreground/50 truncate max-w-[96px] sm:max-w-[128px] px-1 py-0.5">{link.name}</p>
              </a>
            ))}
          </div>
        )}

        {/* Uploaded File Links */}
        {message.fileLinks && message.fileLinks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.fileLinks.map((link, i) => (
              <a
                key={`file-${i}`}
                href={link.url.startsWith("data:") ? "#" : link.url}
                onClick={(event) => {
                  event.preventDefault();
                  void onLegacyFileLinkClick(message, link);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/60 hover:bg-secondary/80 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/30"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="max-w-[150px] truncate">{link.name}</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground/40" />
              </a>
            ))}
          </div>
        )}

        {/* Attachment Metadata Chips */}
        {message.attachments &&
          message.attachments.length > 0 &&
          !message.imageLinks?.length &&
          !message.fileLinks?.length && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.attachments.map((attachment) => {
              const fileType = getFileType({ name: attachment.name, type: attachment.type });

              if (fileType === "image") {
                return (
                  <span key={attachment.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/60 text-xs text-muted-foreground">
                    <FileIcon type={fileType} />
                    {attachment.name}
                  </span>
                );
              }

              return (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => {
                    void onAttachmentFallbackClick(message, attachment);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/60 hover:bg-secondary/80 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/30"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="max-w-[150px] truncate">{attachment.name}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground/40" />
                </button>
              );
            })}
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
                      <CodeBlock
                        language={match[1]}
                        value={String(children).replace(/\n$/, "")}
                        theme={codeTheme}
                        onRun={onRunCode}
                        onSendToPlayground={onSendToPlayground}
                      />
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

// ─── Code Block with Copy / Run / Playground ─────────────
function CodeBlock({
  language,
  value,
  theme,
  onRun,
  onSendToPlayground,
}: {
  language: string;
  value: string;
  theme: CodeTheme;
  onRun: (language: string, value: string) => void;
  onSendToPlayground: (language: string, value: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const normalizedLanguage = (language || "text").toLowerCase();
  const canRun = ["javascript", "js", "typescript", "ts", "html"].includes(normalizedLanguage);
  const styleMap = {
    oneDark,
    oneLight,
  } as const;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-xl border border-border/20 bg-[#1e1e2e]">
      <div className="flex items-center justify-between px-4 py-1.5 bg-black/40 border-b border-white/10">
        <span className="text-xs font-mono text-zinc-400">{language || "text"}</span>
        <div className="flex items-center gap-1">
          {canRun && (
            <button
              onClick={() => onRun(normalizedLanguage, value)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors"
              title="Run code"
            >
              <Zap className="h-3 w-3" />
              Run
            </button>
          )}
          <button
            onClick={() => onSendToPlayground(normalizedLanguage, value)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors"
            title="Send to playground"
          >
            <ExternalLink className="h-3 w-3" />
            Playground
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        style={styleMap[theme]}
        language={language || "text"}
        PreTag="div"
        className="!m-0 !rounded-none !bg-transparent !text-[13px]"
        customStyle={{ padding: "1rem" }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}
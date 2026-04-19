"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  User,
  Bot,
  ChevronDown,
  MessageSquare,
  Clock,
  Archive,
  RefreshCw,
  Download,
  ExternalLink,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";

interface StoredMessagePair {
  userMessage: string;
  response: string;
  model: string;
  timestamp: { seconds: number; nanoseconds: number } | Date | string;
  userAttachments?: { id: string; name: string; type: string; size: number }[];
  imageLinks?: { url: string; name: string; provider?: string }[];
  fileLinks?: { url: string; name: string; provider?: string }[];
  userMessageId: string;
  assistantMessageId: string;
  error?: string | null;
}

interface SessionDoc {
  id: string;
  userId: string;
  userEmail?: string;
  title: string;
  model: string;
  messages: StoredMessagePair[];
  isArchived: boolean;
  createdAt?: { seconds: number };
  updatedAt?: { seconds: number };
  messageCount?: number;
}

interface UserGroup {
  userId: string;
  email: string;
  displayName: string;
  sessions: SessionDoc[];
  totalMessages: number;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

const PAGE_SIZE = 200;

export function AIChatsPanel() {
  const [loading, setLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Load user profiles for name display
  useEffect(() => {
    async function loadProfiles() {
      try {
        const snap = await getDocs(collection(db, "users"));
        const map = new Map<string, UserProfile>();
        snap.docs.forEach((d) => {
          const data = d.data() as UserProfile;
          map.set(data.uid, data);
        });
        setUserProfiles(map);
      } catch (err) {
        console.error("Failed to load user profiles:", err);
      }
    }
    loadProfiles();
  }, []);

  // Load chat sessions
  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      try {
        const allSessions: SessionDoc[] = [];

        // Load active sessions
        const activeQ = query(
          collection(db, "chat_session"),
          orderBy("updatedAt", "desc"),
          limit(PAGE_SIZE)
        );
        const activeSnap = await getDocs(activeQ);
        activeSnap.docs.forEach((d) => {
          allSessions.push({ id: d.id, ...d.data() } as SessionDoc);
        });
        if (activeSnap.docs.length >= PAGE_SIZE) {
          setLastDoc(activeSnap.docs[activeSnap.docs.length - 1]);
        } else {
          setHasMore(false);
        }

        // Load archived sessions
        try {
          const archivedQ = query(
            collection(db, "archived_chats"),
            orderBy("updatedAt", "desc"),
            limit(PAGE_SIZE)
          );
          const archivedSnap = await getDocs(archivedQ);
          archivedSnap.docs.forEach((d) => {
            allSessions.push({
              id: d.id,
              ...d.data(),
              isArchived: true,
            } as SessionDoc);
          });
        } catch {
          // archived_chats may not exist yet
        }

        groupSessions(allSessions);
      } catch (err) {
        console.error("Failed to load chat sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  async function loadMoreSessions() {
    if (!lastDoc || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const moreQ = query(
        collection(db, "chat_session"),
        orderBy("updatedAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(moreQ);
      const newSessions: SessionDoc[] = [];
      snap.docs.forEach((d) => {
        newSessions.push({ id: d.id, ...d.data() } as SessionDoc);
      });
      if (snap.docs.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setLastDoc(snap.docs[snap.docs.length - 1]);
      }
      // Merge into existing groups
      groupSessions([
        ...userGroups.flatMap((g) => g.sessions),
        ...newSessions,
      ]);
    } catch (err) {
      console.error("Failed to load more sessions:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  function groupSessions(sessions: SessionDoc[]) {
    const map = new Map<string, SessionDoc[]>();
    sessions.forEach((s) => {
      const key = s.userId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });

    const groups: UserGroup[] = [];
    map.forEach((sessions, userId) => {
      const profile = userProfiles.get(userId);
      const emailFromSession = sessions.find((s) => s.userEmail)?.userEmail;
      groups.push({
        userId,
        email: profile?.email || emailFromSession || "unknown",
        displayName:
          profile?.displayName || emailFromSession?.split("@")[0] || userId.slice(0, 8),
        sessions: sessions.sort((a, b) => {
          const aTime = a.updatedAt?.seconds || 0;
          const bTime = b.updatedAt?.seconds || 0;
          return bTime - aTime;
        }),
        totalMessages: sessions.reduce(
          (sum, s) => sum + (s.messages?.length || 0),
          0
        ),
      });
    });

    groups.sort((a, b) => {
      const aLatest = a.sessions[0]?.updatedAt?.seconds || 0;
      const bLatest = b.sessions[0]?.updatedAt?.seconds || 0;
      return bLatest - aLatest;
    });

    setUserGroups(groups);
  }

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return userGroups;
    const q = searchQuery.toLowerCase();
    return userGroups.filter(
      (g) =>
        g.displayName.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.userId.toLowerCase().includes(q)
    );
  }, [userGroups, searchQuery]);

  const selectedGroup = useMemo(
    () => userGroups.find((g) => g.userId === selectedUserId),
    [userGroups, selectedUserId]
  );

  const selectedSession = useMemo(() => {
    if (!selectedGroup) return null;
    if (selectedSessionId) {
      return selectedGroup.sessions.find((s) => s.id === selectedSessionId) || null;
    }
    return selectedGroup.sessions[0] || null;
  }, [selectedGroup, selectedSessionId]);

  const visibleSessions = useMemo(() => {
    if (!selectedGroup) return [];
    return showArchived
      ? selectedGroup.sessions
      : selectedGroup.sessions.filter((s) => !s.isArchived);
  }, [selectedGroup, showArchived]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading chat sessions...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-220px)] rounded-lg border border-border/60 overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-72 lg:w-80 border-r border-border/60 flex flex-col">
        <div className="p-3 border-b border-border/40">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-1.5">
            {filteredGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No users found
              </p>
            ) : (
              filteredGroups.map((group) => (
                <button
                  key={group.userId}
                  onClick={() => {
                    setSelectedUserId(group.userId);
                    setSelectedSessionId(null);
                  }}
                  className={cn(
                    "w-full text-left rounded-md px-3 py-2.5 transition-colors",
                    selectedUserId === group.userId
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">
                      {group.displayName}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 shrink-0 ml-2"
                    >
                      {group.sessions.length}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground/60 truncate mt-0.5">
                    {group.userId.slice(0, 20)}...
                  </p>
                  <p className="text-[11px] text-muted-foreground/50 truncate">
                    {group.email}
                  </p>
                </button>
              ))
            )}
          </div>

          {hasMore && (
            <div className="p-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMoreSessions}
                disabled={loadingMore}
                className="text-xs"
              >
                {loadingMore ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Load More
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedGroup ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a user to view their chats
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Session Picker */}
            <div className="border-b border-border/40 p-3 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative">
                  <select
                    value={selectedSession?.id || ""}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="appearance-none bg-secondary/60 border border-border/40 rounded-md px-3 py-1.5 pr-8 text-sm cursor-pointer max-w-[300px] truncate"
                  >
                    {visibleSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.isArchived ? "📦 " : ""}
                        {s.title} ({s.messages?.length || 0} msgs)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>

                {selectedSession && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {selectedSession.model}
                    </Badge>
                    {selectedSession.isArchived && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400"
                      >
                        <Archive className="h-3 w-3 mr-1" />
                        Archived
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded border-border"
                />
                Show archived
              </label>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto p-4 space-y-1">
                {selectedSession?.messages?.map((pair, idx) => (
                  <MessagePairView key={idx} pair={pair} />
                ))}

                {(!selectedSession?.messages ||
                  selectedSession.messages.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No messages in this session
                  </p>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}

function AdminFileCard({ link }: { link: { url: string; name: string; provider?: string } }) {
  const proxyOpenHref = `/api/file-proxy?url=${encodeURIComponent(link.url)}&name=${encodeURIComponent(link.name)}&disposition=inline`;
  const proxyHref = `/api/file-proxy?url=${encodeURIComponent(link.url)}&name=${encodeURIComponent(link.name)}&disposition=attachment`;
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border/30 text-xs">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate max-w-[160px] text-foreground" title={link.name}>
        {link.name}
      </span>
      {link.provider && (
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
          {link.provider}
        </Badge>
      )}
      <a
        href={proxyOpenHref}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in new tab"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <a
        href={proxyHref}
        title="Download"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function MessagePairView({ pair }: { pair: StoredMessagePair }) {
  const timestamp = getTimestamp(pair.timestamp);

  return (
    <>
      {/* User Message */}
      <div className="flex gap-3 py-3 justify-end">
        <div className="max-w-[85%] md:max-w-[75%] flex flex-col items-end">
          {/* Image links */}
          {pair.imageLinks && pair.imageLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pair.imageLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border border-border/40 hover:border-primary/40 transition-all"
                >
                  <img
                    src={link.url}
                    alt={link.name}
                    className="h-24 w-24 sm:h-32 sm:w-32 object-cover"
                    loading="lazy"
                  />
                  <p className="text-[9px] text-muted-foreground/50 truncate max-w-[128px] px-1 py-0.5">
                    {link.name}
                  </p>
                </a>
              ))}
            </div>
          )}

          {/* File links */}
          {pair.fileLinks && pair.fileLinks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pair.fileLinks.map((link, i) => (
                <AdminFileCard key={i} link={link} />
              ))}
            </div>
          )}

          {/* Attachment chips — only when no file/image links exist */}
          {!(pair.fileLinks?.length || pair.imageLinks?.length) &&
            pair.userAttachments &&
            pair.userAttachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {pair.userAttachments.map((att) => (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/60 text-xs text-muted-foreground"
                  >
                    {att.name}
                  </span>
                ))}
              </div>
            )}

          <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-md">
            <div className="prose prose-sm max-w-none prose-invert [&_*]:text-primary-foreground/95">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {pair.userMessage}
              </ReactMarkdown>
            </div>
          </div>

          {timestamp && (
            <span className="text-[10px] text-muted-foreground/40 mt-1 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {timestamp}
            </span>
          )}
        </div>

        <div className="shrink-0 mt-0.5">
          <div className="h-7 w-7 rounded-lg bg-primary/[0.08] flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-primary/70" />
          </div>
        </div>
      </div>

      {/* AI Response */}
      <div className="flex gap-3 py-3 justify-start">
        <div className="shrink-0 mt-0.5">
          <div className="h-7 w-7 rounded-lg bg-primary/[0.08] flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-primary/70" />
          </div>
        </div>

        <div className="max-w-[85%] md:max-w-[75%]">
          <div className="px-0.5">
            <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-p:leading-relaxed prose-code:text-sm">
              {pair.error ? (
                <p className="text-destructive text-sm">{pair.error}</p>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const inline = !match;
                      return inline ? (
                        <code
                          className={cn(
                            "bg-muted/60 dark:bg-muted/40 px-1.5 py-0.5 rounded-md text-[13px] font-mono",
                            className
                          )}
                          {...props}
                        >
                          {children}
                        </code>
                      ) : (
                        <div className="relative my-3 rounded-lg overflow-hidden border border-border/40">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/30">
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {match[1]}
                            </span>
                          </div>
                          <SyntaxHighlighter
                            language={match[1]}
                            style={oneDark}
                            customStyle={{
                              margin: 0,
                              borderRadius: 0,
                              fontSize: "13px",
                            }}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        </div>
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
                  {pair.response}
                </ReactMarkdown>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground/40">
              Model: {pair.model}
            </span>
          </div>
        </div>
      </div>

      <Separator className="my-1 opacity-30" />
    </>
  );
}

function getTimestamp(
  ts: { seconds: number; nanoseconds: number } | Date | string | undefined
): string | null {
  if (!ts) return null;
  try {
    if (typeof ts === "string") {
      return new Date(ts).toLocaleString();
    }
    if (ts instanceof Date) {
      return ts.toLocaleString();
    }
    if ("seconds" in ts) {
      return new Date(ts.seconds * 1000).toLocaleString();
    }
  } catch {
    return null;
  }
  return null;
}

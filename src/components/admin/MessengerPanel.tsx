"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Lock,
  MessageCircle,
  Clock,
  User,
  FileIcon,
  Image as ImageIcon,
  Mic,
  Bot,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationDoc {
  id: string;
  participants: string[];
  participantsKey: string;
  createdAt?: { seconds: number };
  lastMessageAt?: { seconds: number };
  lastMessagePreview: string;
  wrappedKeys: Record<string, string>;
  unread: Record<string, number>;
}

interface MessageDoc {
  id: string;
  senderId: string;
  createdAt?: { seconds: number };
  type: "text" | "image" | "file" | "voice" | "ai";
  ciphertext: string;
  iv: string;
  attachment?: {
    url: string;
    publicId: string;
    resourceType: "image" | "video" | "raw";
    bytes: number;
    mime: string;
    originalName: string;
  };
}

interface UserProfileInfo {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  photoURL?: string;
  publicKey: string;
}

interface ConversationWithMeta {
  conversation: ConversationDoc;
  participantProfiles: Map<string, UserProfileInfo>;
}

export function MessengerPanel() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profilesCache, setProfilesCache] = useState<Map<string, UserProfileInfo>>(new Map());

  // Load all user_profiles for UID → name mapping
  useEffect(() => {
    async function loadProfiles() {
      try {
        const snap = await getDocs(collection(db, "user_profiles"));
        const map = new Map<string, UserProfileInfo>();
        snap.docs.forEach((d) => {
          const data = d.data() as UserProfileInfo;
          map.set(data.uid, data);
        });
        setProfilesCache(map);
      } catch (err) {
        console.error("Failed to load user profiles:", err);
      }
    }
    loadProfiles();
  }, []);

  // Load all conversations
  useEffect(() => {
    async function loadConversations() {
      setLoading(true);
      try {
        const q = query(
          collection(db, "conversations"),
          orderBy("lastMessageAt", "desc"),
          limit(500)
        );
        const snap = await getDocs(q);
        const convos: ConversationWithMeta[] = [];

        for (const d of snap.docs) {
          const data = d.data() as Omit<ConversationDoc, "id">;
          const convo: ConversationDoc = { id: d.id, ...data };

          // Build participant profiles map
          const profiles = new Map<string, UserProfileInfo>();
          for (const uid of convo.participants) {
            if (profilesCache.has(uid)) {
              profiles.set(uid, profilesCache.get(uid)!);
            } else {
              // Try loading from user_profiles
              try {
                const profileDoc = await getDoc(doc(db, "user_profiles", uid));
                if (profileDoc.exists()) {
                  const profile = profileDoc.data() as UserProfileInfo;
                  profiles.set(uid, profile);
                }
              } catch {
                // Permission denied or not found
              }
            }
          }

          convos.push({ conversation: convo, participantProfiles: profiles });
        }

        setConversations(convos);
      } catch (err) {
        console.error("Failed to load conversations:", err);
      } finally {
        setLoading(false);
      }
    }

    if (profilesCache.size > 0 || !loading) {
      loadConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilesCache]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConvoId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const q = query(
          collection(db, "conversations", selectedConvoId!, "messages"),
          orderBy("createdAt", "asc"),
          limit(500)
        );
        const snap = await getDocs(q);
        const msgs: MessageDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as MessageDoc[];
        setMessages(msgs);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
  }, [selectedConvoId]);

  const selectedConvo = useMemo(
    () => conversations.find((c) => c.conversation.id === selectedConvoId),
    [conversations, selectedConvoId]
  );

  // Build user sidebar from conversations
  const userList = useMemo(() => {
    const userMap = new Map<
      string,
      {
        uid: string;
        displayName: string;
        email: string;
        username: string;
        conversationCount: number;
        lastActivity: number;
      }
    >();

    for (const c of conversations) {
      for (const uid of c.conversation.participants) {
        if (!userMap.has(uid)) {
          const profile = c.participantProfiles.get(uid);
          userMap.set(uid, {
            uid,
            displayName: profile?.displayName || uid.slice(0, 8),
            email: profile?.email || "",
            username: profile?.username || "",
            conversationCount: 0,
            lastActivity: 0,
          });
        }
        const entry = userMap.get(uid)!;
        entry.conversationCount++;
        const ts = c.conversation.lastMessageAt?.seconds || 0;
        if (ts > entry.lastActivity) entry.lastActivity = ts;
      }
    }

    return Array.from(userMap.values()).sort(
      (a, b) => b.lastActivity - a.lastActivity
    );
  }, [conversations]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const userConversations = useMemo(() => {
    if (!selectedUserId) return [];
    return conversations.filter((c) =>
      c.conversation.participants.includes(selectedUserId)
    );
  }, [conversations, selectedUserId]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return userList;
    const q = searchQuery.toLowerCase();
    return userList.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
    );
  }, [userList, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading messenger data...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-220px)] rounded-lg border border-border/60 overflow-hidden bg-background">
      {/* User Sidebar */}
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
            {filteredUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No messenger users found
              </p>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => {
                    setSelectedUserId(u.uid);
                    setSelectedConvoId(null);
                  }}
                  className={cn(
                    "w-full text-left rounded-md px-3 py-2.5 transition-colors",
                    selectedUserId === u.uid
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">
                      {u.displayName}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 shrink-0 ml-2"
                    >
                      {u.conversationCount}
                    </Badge>
                  </div>
                  {u.username && (
                    <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                      @{u.username}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground/50 truncate">
                    {u.email}
                  </p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Middle: Conversation List or Message Viewer */}
      <div className="flex-1 flex min-w-0">
        {!selectedUserId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a user to view their conversations
              </p>
            </div>
          </div>
        ) : !selectedConvoId ? (
          /* Thread List */
          <div className="flex-1 flex flex-col">
            <div className="p-3 border-b border-border/40">
              <h3 className="text-sm font-medium">
                Conversations for{" "}
                {userList.find((u) => u.uid === selectedUserId)?.displayName ||
                  selectedUserId.slice(0, 8)}
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {userConversations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No conversations found
                  </p>
                ) : (
                  userConversations.map((c) => {
                    const otherUid = c.conversation.participants.find(
                      (p) => p !== selectedUserId
                    );
                    const otherProfile = otherUid
                      ? c.participantProfiles.get(otherUid)
                      : null;
                    const ts = c.conversation.lastMessageAt?.seconds
                      ? new Date(
                          c.conversation.lastMessageAt.seconds * 1000
                        ).toLocaleString()
                      : "—";

                    return (
                      <button
                        key={c.conversation.id}
                        onClick={() => setSelectedConvoId(c.conversation.id)}
                        className="w-full text-left rounded-md px-3 py-3 hover:bg-accent/50 transition-colors border border-border/30"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary/70" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm truncate">
                                {otherProfile?.displayName ||
                                  otherProfile?.username ||
                                  otherUid?.slice(0, 8) ||
                                  "Unknown"}
                              </span>
                              <Lock className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                            </div>
                            <p className="text-[11px] text-muted-foreground/50 truncate">
                              {otherProfile?.email || ""}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5 text-muted-foreground/40" />
                              <span className="text-[10px] text-muted-foreground/40">
                                {ts}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          /* Message Viewer */
          <div className="flex-1 flex flex-col">
            {/* E2E Banner */}
            <div className="p-3 border-b border-border/40">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  End-to-end encrypted — plaintext not accessible to admin. Showing metadata only.
                </p>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setSelectedConvoId(null)}
                  className="text-xs text-primary hover:underline"
                >
                  ← Back to threads
                </button>

                {selectedConvo && (
                  <span className="text-xs text-muted-foreground">
                    {selectedConvo.conversation.participants
                      .map((uid) => {
                        const profile =
                          selectedConvo.participantProfiles.get(uid);
                        return (
                          profile?.displayName ||
                          profile?.username ||
                          uid.slice(0, 8)
                        );
                      })
                      .join(" ↔ ")}
                  </span>
                )}
              </div>
            </div>

            {/* Messages (metadata only) */}
            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto p-4 space-y-2">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No messages in this conversation
                  </p>
                ) : (
                  messages.map((msg) => {
                    const profile = selectedConvo?.participantProfiles.get(
                      msg.senderId
                    );
                    const senderName =
                      profile?.displayName ||
                      profile?.username ||
                      msg.senderId.slice(0, 8);
                    const isLeft =
                      msg.senderId ===
                      (selectedConvo?.conversation.participants[0] || "");
                    const ts = msg.createdAt?.seconds
                      ? new Date(
                          msg.createdAt.seconds * 1000
                        ).toLocaleString()
                      : "";

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3 py-2",
                          isLeft ? "justify-start" : "justify-end"
                        )}
                      >
                        {isLeft && (
                          <div className="shrink-0 mt-0.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                              {msg.type === "ai" ? (
                                <Bot className="h-3.5 w-3.5 text-primary/70" />
                              ) : (
                                <User className="h-3.5 w-3.5 text-primary/70" />
                              )}
                            </div>
                          </div>
                        )}

                        <div
                          className={cn(
                            "max-w-[75%]",
                            !isLeft && "flex flex-col items-end"
                          )}
                        >
                          <span className="text-[10px] text-muted-foreground/60 mb-0.5">
                            {senderName}
                          </span>

                          <div
                            className={cn(
                              "px-4 py-2.5 rounded-2xl",
                              isLeft
                                ? "bg-secondary/60 rounded-bl-md"
                                : "bg-primary/10 rounded-br-md"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Lock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                              <span className="text-xs text-muted-foreground italic">
                                {msg.type === "ai"
                                  ? "🤖 @ByteReaper AI response"
                                  : `Encrypted ${msg.type} message`}
                                {msg.ciphertext && (
                                  <span className="text-muted-foreground/40 ml-1">
                                    ({msg.ciphertext.length} chars)
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Attachment metadata */}
                            {msg.attachment && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                                {msg.attachment.resourceType === "image" ? (
                                  <ImageIcon className="h-3 w-3" />
                                ) : msg.type === "voice" ? (
                                  <Mic className="h-3 w-3" />
                                ) : (
                                  <FileIcon className="h-3 w-3" />
                                )}
                                <span className="truncate max-w-[200px]">
                                  {msg.attachment.originalName}
                                </span>
                                <span>
                                  ({formatBytes(msg.attachment.bytes)})
                                </span>
                              </div>
                            )}
                          </div>

                          <span className="text-[10px] text-muted-foreground/40 mt-0.5 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {ts}
                          </span>
                        </div>

                        {!isLeft && (
                          <div className="shrink-0 mt-0.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-primary/70" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

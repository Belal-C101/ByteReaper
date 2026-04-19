"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  Timestamp,
  getDoc,
  getDocs,
  setDoc,
  limit,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Send,
  Paperclip,
  Phone,
  ArrowLeft,
  Plus,
  MessageCircle,
  Loader2,
  Lock,
  Image as ImageIcon,
  File as FileIcon,
  Mic,
  X,
  Bot,
  PhoneOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import {
  encryptMessage,
  decryptMessage,
  generateConversationKey,
  wrapKeyForPeer,
  unwrapKey,
  generateIdentity,
  encryptPrivateKey,
  decryptPrivateKey,
  toBase64,
  fromBase64,
} from "@/lib/crypto/e2e";
import { uploadFile } from "@/lib/uploads/client";
import type { Conversation, ChatMessage, UserProfile } from "@/types/private-chat";

// ─── Username setup modal ──────────────────────────────────

function UsernameSetupModal({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    if (!user) return;
    setError("");

    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setError("Username must be 3-20 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }
    if (password.length < 8) {
      setError("E2E password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      // Check username availability
      const usernameDoc = await getDoc(doc(db, "usernames", trimmed.toLowerCase()));
      if (usernameDoc.exists()) {
        setError("Username already taken");
        setLoading(false);
        return;
      }

      // Generate identity keypair
      const identity = await generateIdentity();
      const { encryptedKey, salt } = await encryptPrivateKey(identity.privateKey, password);

      // Save profile (keyed by email)
      await setDoc(doc(db, "user_profiles", (user.email || "").toLowerCase()), {
        uid: user.uid,
        username: trimmed,
        usernameLower: trimmed.toLowerCase(),
        email: user.email || "",
        emailLower: (user.email || "").toLowerCase(),
        displayName: user.displayName || trimmed,
        photoURL: user.photoURL || "",
        publicKey: toBase64(identity.publicKey),
        encryptedPrivateKey: encryptedKey,
        privateKeySalt: salt,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      });

      // Reserve username
      await setDoc(doc(db, "usernames", trimmed.toLowerCase()), {
        uid: user.uid,
      });

      onComplete();
    } catch (err) {
      console.error("Setup error:", err);
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Set Up Private Chat</h2>
            <p className="text-xs text-muted-foreground">
              Choose a username and create an encryption password
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. bytereaper_fan"
              maxLength={20}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              E2E Encryption Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              This encrypts your private key. If you forget it, you lose access to old messages.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Confirm Password
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <Button onClick={handleSetup} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            Create Encrypted Identity
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── E2E unlock modal ──────────────────────────────────────

function UnlockModal({
  profile,
  onUnlock,
}: {
  profile: UserProfile;
  onUnlock: (privateKey: Uint8Array) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async () => {
    setError("");
    setLoading(true);
    try {
      const pk = await decryptPrivateKey(
        profile.encryptedPrivateKey,
        profile.privateKeySalt,
        password
      );
      onUnlock(pk);
    } catch {
      setError("Wrong password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Unlock Messages</h2>
            <p className="text-xs text-muted-foreground">
              Enter your E2E password to decrypt messages
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="E2E encryption password"
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={handleUnlock} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Unlock
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── New conversation modal ────────────────────────────────

function NewConversationModal({
  onClose,
  onStartChat,
}: {
  onClose: () => void;
  onStartChat: (peerUid: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<
    Array<{ uid: string; username: string; displayName: string; email: string; photoURL?: string }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    setSearchError(null);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setSearchError("Not signed in");
        setResults([]);
        return;
      }
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSearchError(data?.error || `Search failed (HTTP ${res.status})`);
        setResults([]);
        return;
      }
      setResults(data.results || []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(searchQuery), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, handleSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="text-lg font-semibold">New Conversation</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or email..."
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {searching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!searching && searchError && (
            <div className="mx-4 my-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <p className="font-medium">Search failed</p>
              <p className="opacity-90 break-words mt-1">{searchError}</p>
            </div>
          )}

          {!searching && !searchError && results.length === 0 && searchQuery.length >= 2 && (
            <div className="text-center py-8 px-6 text-sm text-muted-foreground">
              <p className="font-medium mb-1">No users found</p>
              <p className="text-xs opacity-75">
                Only users who have completed the private-chat setup (username + E2E password)
                appear here. Ask them to visit <span className="font-mono">/chat</span> and set up their profile first.
              </p>
            </div>
          )}

          {!searching &&
            results.map((r) => (
              <button
                key={r.uid}
                onClick={() => onStartChat(r.uid)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {r.photoURL ? (
                    <img src={r.photoURL} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-medium text-primary">
                      {(r.displayName || r.username)[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{r.username}</p>
                </div>
              </button>
            ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────

function MessageBubble({
  message,
  isOwn,
  decryptedText,
}: {
  message: ChatMessage;
  isOwn: boolean;
  decryptedText: string | null;
}) {
  const time = message.createdAt instanceof Timestamp
    ? message.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} px-4 py-0.5`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
          message.type === "ai"
            ? "bg-primary/10 border border-primary/20"
            : isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-secondary"
        }`}
      >
        {message.type === "ai" && (
          <div className="flex items-center gap-1.5 mb-1">
            <Bot className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-medium text-primary">ByteReaper AI</span>
          </div>
        )}

        {message.attachment && (
          <div className="mb-1.5">
            {message.attachment.resourceType === "image" ? (
              <img
                src={message.attachment.url}
                alt={message.attachment.originalName}
                className="max-w-full rounded-lg max-h-[300px] object-contain"
              />
            ) : (
              <a
                href={message.attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg bg-background/30 hover:bg-background/50 transition-colors"
              >
                <FileIcon className="h-4 w-4 shrink-0" />
                <span className="text-xs truncate">
                  {message.attachment.originalName}
                </span>
              </a>
            )}
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap break-words">
          {decryptedText ?? (
            <span className="italic text-muted-foreground/60">
              <Lock className="inline h-3 w-3 mr-1" />
              Encrypted
            </span>
          )}
        </p>

        <p
          className={`text-[10px] mt-0.5 ${
            message.type === "ai"
              ? "text-primary/50"
              : isOwn
                ? "text-primary-foreground/50"
                : "text-muted-foreground/50"
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
}

// ─── Voice call overlay ────────────────────────────────────

function VoiceCallOverlay({
  peerName,
  status,
  onEnd,
}: {
  peerName: string;
  status: "ringing" | "connected";
  onEnd: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-2xl shadow-xl p-4 flex items-center gap-4"
    >
      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
        <Phone className="h-5 w-5 text-green-500" />
      </div>
      <div>
        <p className="text-sm font-medium">{peerName}</p>
        <p className="text-xs text-muted-foreground">
          {status === "ringing" ? "Ringing..." : "Connected"}
        </p>
      </div>
      <Button
        variant="destructive"
        size="icon"
        onClick={onEnd}
        className="h-9 w-9 rounded-full"
      >
        <PhoneOff className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

// ─── Main chat page ────────────────────────────────────────

export default function PrivateChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Profile / identity
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(null);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [peerProfiles, setPeerProfiles] = useState<Record<string, UserProfile>>({});

  // Messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [convKeyCache, setConvKeyCache] = useState<Record<string, Uint8Array>>({});

  // UI
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [callStatus, setCallStatus] = useState<{ peerName: string; status: "ringing" | "connected" } | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );

  // ── Auth guard ───────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // ── Load profile ─────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "user_profiles", (user.email || "").toLowerCase()), (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
        setNeedsSetup(false);
        setNeedsUnlock(true);
      } else {
        setNeedsSetup(true);
      }
    });
    return unsub;
  }, [user]);

  // ── Update lastSeen ──────────────────────────────────────

  useEffect(() => {
    if (!user || !profile) return;
    const interval = setInterval(() => {
      updateDoc(doc(db, "user_profiles", (user.email || "").toLowerCase()), {
        lastSeen: serverTimestamp(),
      }).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, [user, profile]);

  // ── Subscribe to conversations ───────────────────────────

  useEffect(() => {
    if (!user || !privateKey) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const convs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(convs);

      // Load peer profiles
      const peerUids = new Set<string>();
      convs.forEach((c) =>
        c.participants.forEach((p) => {
          if (p !== user.uid) peerUids.add(p);
        })
      );
      peerUids.forEach((uid) => {
        setPeerProfiles((prev) => {
          if (prev[uid]) return prev;
          getDocs(query(collection(db, "user_profiles"), where("uid", "==", uid), limit(1))).then((snap) => {
            if (!snap.empty) {
              setPeerProfiles((p) => ({ ...p, [uid]: snap.docs[0].data() as UserProfile }));
            }
          });
          return prev;
        });
      });
    });
    return unsub;
  }, [user, privateKey]);

  // ── Subscribe to messages when active conversation changes ─

  useEffect(() => {
    if (!activeConvId || !user) return;
    const q = query(
      collection(db, "conversations", activeConvId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(msgs);
      // Scroll to bottom
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index: msgs.length - 1, behavior: "smooth" });
      }, 100);
    });

    // Reset unread
    updateDoc(doc(db, "conversations", activeConvId), {
      [`unread.${user.uid}`]: 0,
    }).catch(() => {});

    return unsub;
  }, [activeConvId, user]);

  // ── Decrypt messages ─────────────────────────────────────

  useEffect(() => {
    if (!privateKey || !profile || !activeConvId) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (!conv) return;

    const decryptAll = async () => {
      // Get or unwrap conversation key
      let convKey = convKeyCache[activeConvId];
      if (!convKey) {
        const wrappedKey = conv.wrappedKeys?.[profile.uid];
        if (!wrappedKey) return;
        try {
          convKey = await unwrapKey(wrappedKey, fromBase64(profile.publicKey), privateKey);
          setConvKeyCache((prev) => ({ ...prev, [activeConvId]: convKey }));
        } catch (err) {
          console.error("Failed to unwrap conversation key:", err);
          return;
        }
      }

      // Decrypt each message
      const newDecrypted: Record<string, string> = {};
      for (const msg of messages) {
        if (decryptedCache[msg.id]) continue;
        try {
          const text = await decryptMessage(msg.ciphertext, msg.iv, convKey);
          newDecrypted[msg.id] = text;
        } catch {
          newDecrypted[msg.id] = "[decryption failed]";
        }
      }

      if (Object.keys(newDecrypted).length > 0) {
        setDecryptedCache((prev) => ({ ...prev, ...newDecrypted }));
      }
    };

    decryptAll();
  }, [messages, privateKey, profile, activeConvId, conversations, convKeyCache, decryptedCache]);

  // ── Unlock handler ───────────────────────────────────────

  const handleUnlock = (pk: Uint8Array) => {
    setPrivateKey(pk);
    setNeedsUnlock(false);
  };

  // ── Start new conversation ───────────────────────────────

  const handleStartChat = async (peerUid: string) => {
    if (!user || !privateKey || !profile) return;
    setShowNewConv(false);

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ peerUid }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // If this is a new conversation (has conversationKey), wrap keys
      if (data.conversationKey) {
        const rawKey = fromBase64(data.conversationKey);
        const myWrapped = await wrapKeyForPeer(rawKey, fromBase64(profile.publicKey));
        const peerWrapped = await wrapKeyForPeer(rawKey, fromBase64(data.peerPublicKey));

        // Update conversation with wrapped keys
        await updateDoc(doc(db, "conversations", data.id), {
          [`wrappedKeys.${user.uid}`]: myWrapped,
          [`wrappedKeys.${peerUid}`]: peerWrapped,
        });

        setConvKeyCache((prev) => ({ ...prev, [data.id]: rawKey }));
      }

      setActiveConvId(data.id);
      setShowSidebar(false);
    } catch (err) {
      console.error("Start chat error:", err);
    }
  };

  // ── Send message ─────────────────────────────────────────

  const handleSend = async () => {
    if (!inputText.trim() || !activeConvId || !user || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const convKey = convKeyCache[activeConvId];
      if (!convKey) throw new Error("No conversation key");

      // Check for @ByteReaper mention
      const hasMention = /@bytereaper/i.test(text);
      const { ciphertext, iv } = await encryptMessage(text, convKey);

      const token = await auth.currentUser?.getIdToken();
      const body: Record<string, unknown> = {
        type: "text",
        ciphertext,
        iv,
      };

      if (hasMention) {
        body.aiMention = { model: "" };
      }

      const res = await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // If AI mention, trigger the mention API
      if (hasMention) {
        const mentionPrompt = text.replace(/@bytereaper/gi, "").trim();
        const mentionRes = await fetch("/api/chat/mention", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversationId: activeConvId,
            messageId: data.id,
            prompt: mentionPrompt,
          }),
        });

        const mentionData = await mentionRes.json();
        if (mentionRes.ok && mentionData.reply) {
          // Encrypt and send AI response
          const aiEncrypted = await encryptMessage(mentionData.reply, convKey);
          await fetch(`/api/conversations/${activeConvId}/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              type: "ai",
              ciphertext: aiEncrypted.ciphertext,
              iv: aiEncrypted.iv,
            }),
          });
        }
      }
    } catch (err) {
      console.error("Send error:", err);
      setInputText(text); // Restore text on failure
    } finally {
      setSending(false);
    }
  };

  // ── Upload attachment ────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId || !user) return;
    e.target.value = "";

    try {
      const convKey = convKeyCache[activeConvId];
      if (!convKey) throw new Error("No conversation key");

      setSending(true);
      const uploaded = await uploadFile(file, "private-chat");

      const isImage = file.type.startsWith("image/");
      const { ciphertext, iv } = await encryptMessage(
        `[${isImage ? "Image" : "File"}: ${file.name}]`,
        convKey
      );

      const token = await auth.currentUser?.getIdToken();
      await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: isImage ? "image" : "file",
          ciphertext,
          iv,
          attachment: {
            url: uploaded.url,
            publicId: uploaded.publicId,
            resourceType: uploaded.resourceType,
            bytes: uploaded.bytes,
            mime: file.type,
            originalName: file.name,
          },
        }),
      });
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setSending(false);
    }
  };

  // ── Voice call ───────────────────────────────────────────

  const handleVoiceCall = async () => {
    if (!activeConvId || !user || !activeConversation) return;
    const peerUid = activeConversation.participants.find((p) => p !== user.uid);
    if (!peerUid) return;

    const peerProfile = peerProfiles[peerUid];
    const peerName = peerProfile?.displayName || peerProfile?.username || "User";

    try {
      const channelName = `br_${activeConvId}_${Date.now()}`;
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/agora/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channelName,
          conversationId: activeConvId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Create call document in Firestore
      await setDoc(doc(db, "calls", channelName), {
        conversationId: activeConvId,
        callerId: user.uid,
        calleeId: peerUid,
        channelName,
        status: "ringing",
        createdAt: serverTimestamp(),
        type: "voice",
      });

      setCallStatus({ peerName, status: "ringing" });

      // Dynamic import for Agora SDK (client-only)
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

      await client.join(data.appId, channelName, data.token, data.uid);
      const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await client.publish([localAudioTrack]);

      setCallStatus({ peerName, status: "connected" });

      // Store cleanup references on window for end call button
      (window as unknown as Record<string, unknown>).__agoraCleanup = async () => {
        localAudioTrack.close();
        await client.leave();
        await updateDoc(doc(db, "calls", channelName), {
          status: "ended",
          endedAt: serverTimestamp(),
        });
        setCallStatus(null);
      };
    } catch (err) {
      console.error("Voice call error:", err);
      setCallStatus(null);
    }
  };

  const handleEndCall = async () => {
    const cleanup = (window as unknown as Record<string, unknown>).__agoraCleanup as (() => Promise<void>) | undefined;
    if (cleanup) await cleanup();
    else setCallStatus(null);
  };

  // ── Typing indicator ────────────────────────────────────

  useEffect(() => {
    if (!activeConvId || !user || !inputText) return;
    const timeout = setTimeout(() => {
      updateDoc(doc(db, "conversations", activeConvId), {
        [`typing.${user.uid}`]: Date.now(),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [inputText, activeConvId, user]);

  // ── Peer info helper ─────────────────────────────────────

  const getPeerForConv = (conv: Conversation) => {
    if (!user) return null;
    const peerUid = conv.participants.find((p) => p !== user.uid);
    if (!peerUid) return null;
    return peerProfiles[peerUid] || null;
  };

  // ── Loading states ───────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (needsSetup) {
    return <UsernameSetupModal onComplete={() => setNeedsSetup(false)} />;
  }

  if (needsUnlock && profile) {
    return <UnlockModal profile={profile} onUnlock={handleUnlock} />;
  }

  if (!profile || !privateKey) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Call overlay */}
      <AnimatePresence>
        {callStatus && (
          <VoiceCallOverlay
            peerName={callStatus.peerName}
            status={callStatus.status}
            onEnd={handleEndCall}
          />
        )}
      </AnimatePresence>

      {/* New conversation modal */}
      <AnimatePresence>
        {showNewConv && (
          <NewConversationModal
            onClose={() => setShowNewConv(false)}
            onStartChat={handleStartChat}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden md:flex"
        } flex-col w-full md:w-80 lg:w-96 border-r border-border/50 bg-background`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Messages</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNewConv(true)}
            className="h-8 w-8"
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-primary/40" />
              </div>
              <p className="text-sm font-medium mb-1">No conversations yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Start a new conversation to chat with someone
              </p>
              <Button size="sm" onClick={() => setShowNewConv(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Chat
              </Button>
            </div>
          ) : (
            conversations.map((conv) => {
              const peer = getPeerForConv(conv);
              const unread = conv.unread?.[user.uid] || 0;
              const isActive = conv.id === activeConvId;

              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setShowSidebar(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                    isActive
                      ? "bg-accent/60"
                      : "hover:bg-accent/30"
                  }`}
                >
                  <div className="relative h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {peer?.photoURL ? (
                      <img src={peer.photoURL} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium text-primary">
                        {(peer?.displayName || peer?.username || "?")[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {peer?.displayName || peer?.username || "Unknown"}
                      </p>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {conv.lastMessageAt instanceof Timestamp
                            ? formatRelativeTime(conv.lastMessageAt.toDate())
                            : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessagePreview || "No messages yet"}
                      </p>
                      {unread > 0 && (
                        <span className="ml-2 h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center shrink-0">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        className={`${
          showSidebar ? "hidden md:flex" : "flex"
        } flex-1 flex-col bg-background`}
      >
        {activeConvId && activeConversation ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSidebar(true)}
                  className="h-8 w-8 md:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const peer = getPeerForConv(activeConversation);
                  return (
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {peer?.photoURL ? (
                          <img src={peer.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <span className="text-xs font-medium text-primary">
                            {(peer?.displayName || "?")[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {peer?.displayName || peer?.username || "Unknown"}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" />
                          End-to-end encrypted
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleVoiceCall}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Voice call"
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden">
              <Virtuoso
                ref={virtuosoRef}
                data={messages}
                followOutput="smooth"
                className="h-full"
                itemContent={(index, msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.senderId === user.uid}
                    decryptedText={decryptedCache[msg.id] ?? null}
                  />
                )}
              />
            </div>

            {/* Input area */}
            <div className="border-t border-border/50 p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message... (@ByteReaper for AI)"
                  className="flex-1"
                />

                <Button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  size="icon"
                  className="h-9 w-9 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-11">
                Type <span className="font-medium">@ByteReaper</span> to ask AI
              </p>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
              <MessageCircle className="h-10 w-10 text-primary/30" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Welcome to Private Chat</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-1">
              End-to-end encrypted messaging. Select a conversation or start a new one.
            </p>
            <p className="text-xs text-muted-foreground/60 flex items-center gap-1 mb-4">
              <Lock className="h-3 w-3" />
              Messages are encrypted with XSalsa20-Poly1305
            </p>
            <Button onClick={() => setShowNewConv(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Start Conversation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper ─────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

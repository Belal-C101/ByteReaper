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
  arrayUnion,
  writeBatch,
  deleteDoc,
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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Bot,
  PhoneOff,
  Check,
  CheckCheck,
  Clock,
  PhoneIncoming,
  PhoneCall,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import type { IAgoraRTCClient, IMicrophoneAudioTrack, IRemoteAudioTrack } from "agora-rtc-sdk-ng";
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
import { Attachment } from "@/components/chat/Attachment";
import { VoiceRecorder, VoiceBubble } from "@/components/messenger/VoiceRecorder";
import type { Conversation, ChatMessage, UserProfile } from "@/types/private-chat";

const DEBUG_PRIVATE_CHAT =
  process.env.NEXT_PUBLIC_BYTEREAPER_DEBUG === "1" || process.env.NODE_ENV !== "production";

function privateDebugLog(message: string, payload?: unknown) {
  if (!DEBUG_PRIVATE_CHAT) return;
  if (typeof payload === "undefined") {
    console.log("[ByteReaper]", message);
    return;
  }
  console.log("[ByteReaper]", message, payload);
}

/** Route Cloudinary URLs through the file-proxy so the server can sign them */
function proxyCloudinaryUrl(url: string, name?: string): string {
  if (!url.includes("res.cloudinary.com")) return url;
  const params = new URLSearchParams({ url, disposition: "inline" });
  if (name) params.set("name", name);
  return `/api/file-proxy?${params.toString()}`;
}

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
    } catch (err) {
      console.error("[ByteReaper] handleUnlock:error", err);
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
  creating,
  startChatError,
}: {
  onClose: () => void;
  onStartChat: (peerUid: string) => void;
  creating?: boolean;
  startChatError?: string | null;
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
          {creating && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Starting conversation...</span>
            </div>
          )}

          {!creating && startChatError && (
            <div className="mx-4 my-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <p className="font-medium">Failed to start chat</p>
              <p className="opacity-90 break-words mt-1">{startChatError}</p>
            </div>
          )}

          {searching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!searching && !creating && searchError && (
            <div className="mx-4 my-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <p className="font-medium">Search failed</p>
              <p className="opacity-90 break-words mt-1">{searchError}</p>
            </div>
          )}

          {!searching && !creating && !searchError && results.length === 0 && searchQuery.length >= 2 && (
            <div className="text-center py-8 px-6 text-sm text-muted-foreground">
              <p className="font-medium mb-1">No users found</p>
              <p className="text-xs opacity-75">
                Only users who have completed the private-chat setup (username + E2E password)
                appear here. Ask them to visit <span className="font-mono">/chat</span> and set up their profile first.
              </p>
            </div>
          )}

          {!searching && !creating &&
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
  peerUid,
}: {
  message: ChatMessage;
  isOwn: boolean;
  decryptedText: string | null;
  peerUid?: string;
}) {
  const time = message.createdAt instanceof Timestamp
    ? message.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  // Determine read-receipt status for own messages
  const isPending = (message as ChatMessage & { _pending?: boolean })._pending;
  const isFailed = (message as ChatMessage & { _failed?: boolean })._failed;
  const isRead = isOwn && peerUid ? message.readBy?.includes(peerUid) : false;

  // System messages (call summaries) render differently
  if (message.type === "system") {
    return (
      <div className="flex justify-center px-4 py-1">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 text-muted-foreground">
          <PhoneCall className="h-3 w-3" />
          <span className="text-[11px]">{decryptedText || "Call"}</span>
          {time && <span className="text-[10px] opacity-60">· {time}</span>}
        </div>
      </div>
    );
  }

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
            {message.type === "voice" ? (
              (() => {
                let dur = (message.attachment as { durationSec?: number }).durationSec;
                // Fallback: parse from decrypted text "[Voice message: Xs]" for old messages
                if (!dur && decryptedText) {
                  const m = decryptedText.match(/\[Voice message:\s*(\d+)s\]/i);
                  if (m) dur = parseInt(m[1], 10);
                }
                return (
                  <VoiceBubble
                    url={proxyCloudinaryUrl(message.attachment.url, message.attachment.originalName)}
                    durationSec={dur}
                  />
                );
              })()
            ) : (
              <Attachment
                attachment={{
                  url: message.attachment.url,
                  publicId: message.attachment.publicId,
                  resourceType: message.attachment.resourceType,
                  bytes: message.attachment.bytes,
                  mime: message.attachment.mime,
                  originalName: message.attachment.originalName,
                }}
              />
            )}
          </div>
        )}

        {message.type !== "voice" && (
          <p className="text-sm whitespace-pre-wrap break-words">
            {decryptedText ?? (
              <span className="italic text-muted-foreground/60">
                <Lock className="inline h-3 w-3 mr-1" />
                Encrypted
              </span>
            )}
          </p>
        )}

        <p
          className={`text-[10px] mt-0.5 flex items-center gap-1 ${
            message.type === "ai"
              ? "text-primary/50"
              : isOwn
                ? "text-primary-foreground/50"
                : "text-muted-foreground/50"
          } ${isOwn ? "justify-end" : ""}`}
        >
          {time}
          {isOwn && (
            isPending ? (
              <Clock className="h-3 w-3 opacity-60" />
            ) : isFailed ? (
              <span className="text-destructive font-medium">!</span>
            ) : isRead ? (
              <CheckCheck className="h-3 w-3 text-green-500" />
            ) : (
              <CheckCheck className="h-3 w-3 text-muted-foreground" />
            )
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Voice call overlay ────────────────────────────────────

function VoiceCallOverlay({
  peerName,
  status,
  startTime,
  onEnd,
  isMuted,
  onToggleMute,
  isSpeakerOn,
  onToggleSpeaker,
}: {
  peerName: string;
  status: "ringing" | "connected";
  startTime: number | null;
  onEnd: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isSpeakerOn: boolean;
  onToggleSpeaker: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  // Call duration timer
  useEffect(() => {
    if (status !== "connected" || !startTime) {
      setElapsed(0);
      return;
    }
    setElapsed(Math.floor((Date.now() - startTime) / 1000));
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [status, startTime]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        onToggleMute();
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        onToggleSpeaker();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleMute, onToggleSpeaker]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-2xl shadow-xl p-4 flex items-center gap-3"
    >
      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
        <Phone className="h-5 w-5 text-green-500" />
      </div>
      <div>
        <p className="text-sm font-medium">{peerName}</p>
        <p className="text-xs text-muted-foreground">
          {status === "ringing" ? "Ringing..." : `Connected · ${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, "0")}`}
          {status === "connected" && isMuted && " · Muted"}
        </p>
      </div>

      {/* Mic mute/unmute */}
      <Button
        variant={isMuted ? "secondary" : "ghost"}
        size="icon"
        onClick={onToggleMute}
        className="h-9 w-9 rounded-full"
        aria-label={isMuted ? "Unmute microphone (M)" : "Mute microphone (M)"}
        aria-pressed={isMuted}
        title={isMuted ? "Unmute microphone (M)" : "Mute microphone (M)"}
      >
        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>

      {/* Speaker on/off */}
      <Button
        variant={!isSpeakerOn ? "secondary" : "ghost"}
        size="icon"
        onClick={onToggleSpeaker}
        className="h-9 w-9 rounded-full"
        aria-label={isSpeakerOn ? "Speaker off (S)" : "Speaker on (S)"}
        aria-pressed={!isSpeakerOn}
        title={isSpeakerOn ? "Speaker off (S)" : "Speaker on (S)"}
      >
        {isSpeakerOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </Button>

      {/* End call */}
      <Button
        variant="destructive"
        size="icon"
        onClick={onEnd}
        className="h-9 w-9 rounded-full"
        aria-label="End call"
        title="End call"
      >
        <PhoneOff className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

// ─── Incoming call modal ──────────────────────────────────

function IncomingCallModal({
  peerName,
  onAnswer,
  onDecline,
}: {
  peerName: string;
  onAnswer: () => void;
  onDecline: () => void;
}) {
  // Auto-decline after 60 seconds
  useEffect(() => {
    const timer = setTimeout(onDecline, 60_000);
    return () => clearTimeout(timer);
  }, [onDecline]);

  // Play ringtone using Web Audio API (no file needed)
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    try {
      ctx = new AudioContext();
      // Ring pattern: two-tone beep every 2 seconds
      const playBeep = () => {
        if (!ctx || ctx.state === "closed") return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(520, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      };
      playBeep();
      intervalId = setInterval(playBeep, 2000);
    } catch { /* AudioContext not available */ }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (ctx && ctx.state !== "closed") ctx.close().catch(() => {});
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-xs mx-4 rounded-2xl border border-border bg-card p-6 shadow-xl text-center">
        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <PhoneIncoming className="h-8 w-8 text-green-500 animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold">{peerName}</h3>
        <p className="text-sm text-muted-foreground mb-6">Incoming voice call...</p>
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={onDecline}
            aria-label="Decline call"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white"
            onClick={onAnswer}
            aria-label="Answer call"
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>
      </div>
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
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [callStatus, setCallStatus] = useState<{ peerName: string; status: "ringing" | "connected" } | null>(null);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callDocId: string;
    channelName: string;
    conversationId: string;
    callerId: string;
    peerName: string;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [startChatError, setStartChatError] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadProgressPct, setUploadProgressPct] = useState(0);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callClientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const remoteAudioTrackRef = useRef<IRemoteAudioTrack | null>(null);
  const activeCallChannelRef = useRef<string | null>(null);
  const acceptedIncomingCallIdRef = useRef<string | null>(null);
  const callAcceptedAtRef = useRef<number | null>(null);
  const summarySentRef = useRef<Set<string>>(new Set());
  const callerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callerCallUnsubRef = useRef<(() => void) | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );

  useEffect(() => {
    privateDebugLog("state:sending", { sending });
  }, [sending]);

  useEffect(() => {
    privateDebugLog("state:callStatus", { callStatus });
  }, [callStatus]);

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
      }).catch((err) => {
        console.error("[ByteReaper] updateLastSeen:error", err);
      });
    }, 300_000);
    return () => clearInterval(interval);
  }, [user, profile]);

  // ── Subscribe to conversations ───────────────────────────

  useEffect(() => {
    if (!user || !privateKey) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const convs = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Conversation))
          .sort((a, b) => {
            const aTime = a.lastMessageAt instanceof Timestamp ? a.lastMessageAt.toMillis() : 0;
            const bTime = b.lastMessageAt instanceof Timestamp ? b.lastMessageAt.toMillis() : 0;
            return bTime - aTime;
          });
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
      },
      (err) => {
        console.error("Conversations listener error:", err);
      }
    );
    return unsub;
  }, [user, privateKey]);

  // ── Subscribe to messages when active conversation changes ─

  useEffect(() => {
    if (!activeConvId || !user) return;
    const q = query(
      collection(db, "conversations", activeConvId, "messages"),
      orderBy("createdAt", "asc")
    );

    // Helper to mark unread messages from peer as read
    const markAsRead = (msgs: ChatMessage[]) => {
      if (document.visibilityState !== "visible") return;
      const unreadFromPeer = msgs.filter(
        (m) => m.senderId !== user.uid && (!m.readBy || !m.readBy.includes(user.uid))
      );
      if (unreadFromPeer.length > 0) {
        const batch = writeBatch(db);
        unreadFromPeer.forEach((m) => {
          batch.update(doc(db, "conversations", activeConvId, "messages", m.id), {
            readBy: arrayUnion(user.uid),
          });
        });
        batch.commit().catch((err) => {
          console.error("[ByteReaper] readBy:batch:error", err);
        });
      }
    };

    let latestMsgs: ChatMessage[] = [];

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
        setMessages(msgs);
        latestMsgs = msgs;

        markAsRead(msgs);

        // Scroll to bottom
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index: msgs.length - 1, behavior: "smooth" });
        }, 100);
      },
      (err) => {
        console.error("Messages listener error:", err);
      }
    );

    // Re-mark as read when page becomes visible (mobile background recovery)
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && latestMsgs.length > 0) {
        markAsRead(latestMsgs);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Reset unread
    updateDoc(doc(db, "conversations", activeConvId), {
      [`unread.${user.uid}`]: 0,
    }).catch((err) => {
      console.error("[ByteReaper] resetUnread:error", err);
    });

    return () => {
      unsub();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
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
        } catch (err) {
          console.error("[ByteReaper] decryptMessage:error", {
            messageId: msg.id,
            err,
          });
          newDecrypted[msg.id] = "[decryption failed]";
        }
      }

      if (Object.keys(newDecrypted).length > 0) {
        setDecryptedCache((prev) => ({ ...prev, ...newDecrypted }));
      }
    };

    decryptAll();
  }, [messages, privateKey, profile, activeConvId, conversations, convKeyCache, decryptedCache]);

  const bootstrapConversationKey = useCallback(async (conversationId: string, conversation: Conversation) => {
    if (!user || !profile) {
      throw new Error("Encryption identity is not unlocked.");
    }

    const peerUid = conversation.participants.find((uid) => uid !== user.uid);
    if (!peerUid) {
      throw new Error("Conversation participant data is invalid.");
    }

    const resolvePeerPublicKey = async (): Promise<string> => {
      const cachedPeerPublicKey = peerProfiles[peerUid]?.publicKey;
      if (cachedPeerPublicKey) return cachedPeerPublicKey;

      const peerSnap = await getDocs(
        query(collection(db, "user_profiles"), where("uid", "==", peerUid), limit(1))
      );

      if (peerSnap.empty) {
        throw new Error("Peer profile not found. Ask the other user to complete private chat setup.");
      }

      const peerData = peerSnap.docs[0].data() as UserProfile;
      if (!peerData.publicKey) {
        throw new Error("Peer encryption key is missing. Ask the other user to re-setup private chat.");
      }

      return peerData.publicKey;
    };

    const localBootstrap = async () => {
      const peerPublicKey = await resolvePeerPublicKey();
      const rawKey = await generateConversationKey();
      const myWrapped = await wrapKeyForPeer(rawKey, fromBase64(profile.publicKey));
      const peerWrapped = await wrapKeyForPeer(rawKey, fromBase64(peerPublicKey));

      await updateDoc(doc(db, "conversations", conversationId), {
        [`wrappedKeys.${user.uid}`]: myWrapped,
        [`wrappedKeys.${peerUid}`]: peerWrapped,
      });

      setConvKeyCache((prev) => ({ ...prev, [conversationId]: rawKey }));
      privateDebugLog("resolveConversationKey:bootstrap:local-success", { conversationId, peerUid });
      return rawKey;
    };

    privateDebugLog("resolveConversationKey:bootstrap:start", { conversationId, peerUid });

    let remoteBootstrapError: string | null = null;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("Not signed in.");
      }

      const res = await fetch(`/api/conversations/${conversationId}/bootstrap-key`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({} as { error?: string; conversationKey?: string; peerPublicKey?: string }));
      if (!res.ok) {
        throw new Error(data.error || `Failed to reinitialize conversation key (HTTP ${res.status})`);
      }

      if (!data.conversationKey || !data.peerPublicKey) {
        throw new Error("Bootstrap response missing encryption key metadata.");
      }

      const rawKey = fromBase64(data.conversationKey);
      const myWrapped = await wrapKeyForPeer(rawKey, fromBase64(profile.publicKey));
      const peerWrapped = await wrapKeyForPeer(rawKey, fromBase64(data.peerPublicKey));

      await updateDoc(doc(db, "conversations", conversationId), {
        [`wrappedKeys.${user.uid}`]: myWrapped,
        [`wrappedKeys.${peerUid}`]: peerWrapped,
      });

      setConvKeyCache((prev) => ({ ...prev, [conversationId]: rawKey }));
      privateDebugLog("resolveConversationKey:bootstrap:end", { conversationId, peerUid });
      return rawKey;
    } catch (err) {
      remoteBootstrapError = err instanceof Error ? err.message : "Unknown bootstrap API error";
      console.warn("[ByteReaper] resolveConversationKey:bootstrap:remote-failed", err);
    }

    try {
      return await localBootstrap();
    } catch (localErr) {
      const localReason = localErr instanceof Error ? localErr.message : "Unknown local bootstrap error";
      throw new Error(
        `Conversation key recovery failed. Remote: ${remoteBootstrapError || "n/a"}. Local fallback: ${localReason}`
      );
    }
  }, [peerProfiles, profile, user]);

  const resolveConversationKey = useCallback(async (conversationId: string) => {
    privateDebugLog("resolveConversationKey:start", { conversationId });

    const cached = convKeyCache[conversationId];
    if (cached) {
      privateDebugLog("resolveConversationKey:cache-hit", { conversationId });
      return cached;
    }

    if (!privateKey || !profile) {
      throw new Error("Encryption identity is not unlocked.");
    }

    const conversation = conversations.find((conv) => conv.id === conversationId);
    if (!conversation) {
      throw new Error("Conversation not found.");
    }

    const wrappedKey = conversation.wrappedKeys?.[profile.uid];
    if (!wrappedKey) {
      privateDebugLog("resolveConversationKey:missing-wrapped-key", {
        conversationId,
        profileUid: profile.uid,
      });

      try {
        return await bootstrapConversationKey(conversationId, conversation);
      } catch (bootstrapError) {
        console.error("[ByteReaper] resolveConversationKey:bootstrap-error", bootstrapError);
        if (bootstrapError instanceof Error) {
          throw new Error(`Conversation key not available for current user. ${bootstrapError.message}`);
        }
        throw new Error("Conversation key not available for current user. Recovery failed.");
      }
    }

    const unwrapped = await unwrapKey(wrappedKey, fromBase64(profile.publicKey), privateKey);
    setConvKeyCache((prev) => ({ ...prev, [conversationId]: unwrapped }));
    privateDebugLog("resolveConversationKey:unwrapped", { conversationId });
    return unwrapped;
  }, [bootstrapConversationKey, convKeyCache, conversations, privateKey, profile]);

  // Cleanup caller-side listeners
  const cleanupCallerListeners = useCallback(() => {
    if (callerTimeoutRef.current) {
      clearTimeout(callerTimeoutRef.current);
      callerTimeoutRef.current = null;
    }
    if (callerCallUnsubRef.current) {
      callerCallUnsubRef.current();
      callerCallUnsubRef.current = null;
    }
  }, []);

  const cleanupAgoraClient = useCallback(async (reason: string) => {
    privateDebugLog("call:cleanup-agora:start", {
      reason,
      channelName: activeCallChannelRef.current,
    });

    const localTrack = localAudioTrackRef.current;
    if (localTrack) {
      localTrack.stop();
      localTrack.close();
      localAudioTrackRef.current = null;
    }

    const remoteTrack = remoteAudioTrackRef.current;
    if (remoteTrack) {
      remoteTrack.stop();
      remoteAudioTrackRef.current = null;
    }

    const client = callClientRef.current;
    if (client) {
      try {
        await client.leave();
      } catch (leaveErr) {
        console.error("[ByteReaper] call:cleanup:leave-error", leaveErr);
      }
      callClientRef.current = null;
    }

    privateDebugLog("call:cleanup-agora:end", { reason });
  }, []);

  const cleanupCallUI = useCallback((reason: string) => {
    privateDebugLog("call:cleanup-ui:start", {
      reason,
      channelName: activeCallChannelRef.current,
    });
    cleanupCallerListeners();

    activeCallChannelRef.current = null;
    acceptedIncomingCallIdRef.current = null;
    callAcceptedAtRef.current = null;
    setCallStatus(null);
    setCallStartTime(null);
    setIsMuted(false);
    setIsSpeakerOn(true);
    privateDebugLog("call:cleanup-ui:end", { reason });
  }, [cleanupCallerListeners]);

  const toggleMute = useCallback(() => {
    const track = localAudioTrackRef.current;
    if (track) {
      track.setEnabled(isMuted); // was muted, now enable (or vice versa)
    }
    setIsMuted((m) => !m);
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    const el = remoteAudioRef.current;
    if (el) {
      el.muted = isSpeakerOn; // was on, now mute (or vice versa)
    }
    // Also mute the remote audio track if available
    const remoteTrack = remoteAudioTrackRef.current;
    if (remoteTrack) {
      remoteTrack.setVolume(isSpeakerOn ? 0 : 100);
    }
    setIsSpeakerOn((s) => !s);
  }, [isSpeakerOn]);

  const joinVoiceChannel = useCallback(async (
    channelName: string,
    conversationId: string,
    peerName: string
  ) => {
    privateDebugLog("call:join:start", { channelName, conversationId, peerName });

    if (!user) {
      throw new Error("User is not authenticated.");
    }

    await cleanupAgoraClient("join-new-channel");

    const token = await auth.currentUser?.getIdToken();
    const res = await fetch("/api/agora/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channelName,
        conversationId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `Agora token failed (HTTP ${res.status})`);
    }

    const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    client.on("user-published", async (remoteUser, mediaType) => {
      privateDebugLog("call:user-published", {
        uid: remoteUser.uid,
        mediaType,
      });

      await client.subscribe(remoteUser, mediaType);
      if (mediaType === "audio" && remoteUser.audioTrack) {
        remoteAudioTrackRef.current = remoteUser.audioTrack;
        if (remoteAudioRef.current) {
          remoteUser.audioTrack.play();
        } else {
          remoteUser.audioTrack.play();
        }
      }
    });

    client.on("user-unpublished", (remoteUser, mediaType) => {
      privateDebugLog("call:user-unpublished", {
        uid: remoteUser.uid,
        mediaType,
      });
    });

    client.on("connection-state-change", (curState, prevState, reason) => {
      privateDebugLog("call:connection-state", { curState, prevState, reason });
      if (curState === "CONNECTED" && callAcceptedAtRef.current === null) {
        const connectedAtMs = Date.now();
        callAcceptedAtRef.current = connectedAtMs;
        setCallStartTime((prev) => prev ?? connectedAtMs);
      }
    });

    await client.join(data.appId, channelName, data.token, data.uid);
    const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await client.publish([localAudioTrack]);

    callClientRef.current = client;
    localAudioTrackRef.current = localAudioTrack;
    activeCallChannelRef.current = channelName;
    privateDebugLog("call:join:end", { channelName, peerName });
  }, [cleanupAgoraClient, user]);

  // ── Send a system message for call events ─────────────────

  const sendCallSummary = useCallback(async (conversationId: string, summaryText: string) => {
    const attempt = async () => {
      const convKey = await resolveConversationKey(conversationId);
      const { ciphertext, iv } = await encryptMessage(summaryText, convKey);
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "system", ciphertext, iv }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    };
    try {
      await attempt();
    } catch (err) {
      console.warn("[ByteReaper] sendCallSummary: first attempt failed, retrying...", err);
      await new Promise((r) => setTimeout(r, 2000));
      try {
        await attempt();
      } catch (retryErr) {
        console.error("[ByteReaper] sendCallSummary: retry failed", retryErr);
      }
    }
  }, [resolveConversationKey]);

  const formatVoiceCallDurationSummary = useCallback((durationSec: number) => {
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    return `Voice call · ${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const computeCallDurationSec = useCallback(() => {
    const acceptedAtMs = callAcceptedAtRef.current ?? callStartTime;
    if (!acceptedAtMs) return null;
    return Math.max(1, Math.round((Date.now() - acceptedAtMs) / 1000));
  }, [callStartTime]);

  const sendCallSummaryOnce = useCallback(async (
    conversationId: string,
    channelName: string,
    outcome: "duration" | "declined" | "missed",
    durationSec?: number | null
  ) => {
    if (!conversationId || !channelName) return;
    if (summarySentRef.current.has(channelName)) {
      privateDebugLog("sendCallSummaryOnce:skipped", { channelName, outcome });
      return;
    }

    summarySentRef.current.add(channelName);

    let summaryText = "Voice call · Missed";
    if (outcome === "declined") {
      summaryText = "Voice call · Declined";
    } else if (outcome === "duration") {
      const measuredDuration = durationSec ?? computeCallDurationSec() ?? 1;
      summaryText = formatVoiceCallDurationSummary(Math.max(1, Math.round(measuredDuration)));
    }

    await sendCallSummary(conversationId, summaryText);
  }, [computeCallDurationSec, formatVoiceCallDurationSummary, sendCallSummary]);

  // ── Answer / Decline incoming call ──────────────────────

  const handleAnswerCall = useCallback(async () => {
    if (!incomingCall) return;
    const { callDocId, channelName, conversationId, peerName } = incomingCall;
    setIncomingCall(null);
    summarySentRef.current.delete(channelName);

    try {
      await updateDoc(doc(db, "calls", callDocId), {
        status: "accepted",
        acceptedAt: serverTimestamp(),
      });
      const acceptedAtMs = Date.now();
      callAcceptedAtRef.current = acceptedAtMs;
      setCallStatus({ peerName, status: "connected" });
      setCallStartTime(acceptedAtMs);
      await joinVoiceChannel(channelName, conversationId, peerName);
    } catch (err) {
      console.error("[ByteReaper] handleAnswerCall:error", err);
      setActionError(err instanceof Error ? err.message : "Failed to answer call.");
    }
  }, [incomingCall, joinVoiceChannel]);

  const handleDeclineCall = useCallback(async () => {
    if (!incomingCall) return;
    const { callDocId, channelName, conversationId } = incomingCall;
    setIncomingCall(null);

    try {
      await sendCallSummaryOnce(conversationId, channelName, "declined");
      await updateDoc(doc(db, "calls", callDocId), {
        status: "rejected",
        endedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("[ByteReaper] handleDeclineCall:error", err);
    }
  }, [incomingCall, sendCallSummaryOnce]);

  // ── Unlock handler ───────────────────────────────────────

  const handleUnlock = (pk: Uint8Array) => {
    setPrivateKey(pk);
    setNeedsUnlock(false);
  };

  // ── Start new conversation ───────────────────────────────

  const handleStartChat = async (peerUid: string) => {
    if (!user || !privateKey || !profile) return;
    setStartChatError(null);
    setCreatingChat(true);
    setShowNewConv(false);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ peerUid }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);

      // If this is a new conversation (has conversationKey), wrap keys
      if (data.conversationKey) {
        const rawKey = fromBase64(data.conversationKey);
        const myWrapped = await wrapKeyForPeer(rawKey, fromBase64(profile.publicKey));
        const peerWrapped = await wrapKeyForPeer(rawKey, fromBase64(data.peerPublicKey));

        // Cache first so immediate sends don't race React state with Firestore sync.
        setConvKeyCache((prev) => ({ ...prev, [data.id]: rawKey }));

        // Persist wrapped keys asynchronously; cache keeps chat usable immediately.
        void updateDoc(doc(db, "conversations", data.id), {
          [`wrappedKeys.${user.uid}`]: myWrapped,
          [`wrappedKeys.${peerUid}`]: peerWrapped,
        }).catch((persistErr) => {
          console.error("[ByteReaper] handleStartChat:persistWrappedKeys:error", persistErr);
        });
      }

      setActiveConvId(data.id);
      setShowSidebar(false);
    } catch (err) {
      console.error("Start chat error:", err);
      setStartChatError(err instanceof Error ? err.message : "Failed to start chat");
      setShowNewConv(true);
    } finally {
      setCreatingChat(false);
    }
  };

  // ── Send message ─────────────────────────────────────────

  const handleSend = async () => {
    privateDebugLog("handleSend:start", {
      activeConvId,
      inputLength: inputText.length,
      sending,
    });
    if (!inputText.trim() || !activeConvId || !user || sending) return;
    const text = inputText.trim();
    setActionError(null);
    setInputText("");
    setSending(true);

    // Optimistic: insert a pending message immediately
    const tempId = `_pending_${Date.now()}`;
    const optimisticMsg: ChatMessage & { _pending?: boolean; _plaintext?: string } = {
      id: tempId,
      senderId: user.uid,
      createdAt: Timestamp.now(),
      type: "text",
      ciphertext: "",
      iv: "",
      readBy: [user.uid],
      _pending: true,
      _plaintext: text,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setDecryptedCache((prev) => ({ ...prev, [tempId]: text }));
    setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({ index: messages.length, behavior: "smooth" });
    }, 50);

    try {
      const convKey = await resolveConversationKey(activeConvId);

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

      // Remove optimistic message — the onSnapshot listener will deliver the real one
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDecryptedCache((prev) => {
        const next = { ...prev };
        delete next[tempId];
        return next;
      });

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
      console.error("[ByteReaper] handleSend:error", err);
      setActionError(err instanceof Error ? err.message : "Failed to send message.");
      // Mark optimistic message as failed instead of removing
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, _pending: false, _failed: true } as ChatMessage & { _pending?: boolean; _failed?: boolean } : m
        )
      );
      setInputText(text); // Restore text on failure
    } finally {
      setSending(false);
      privateDebugLog("handleSend:end", { activeConvId });
    }
  };

  // ── Upload attachment ────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    privateDebugLog("handleFileUpload:start", {
      activeConvId,
      sending,
      files: e.target.files?.length ?? 0,
    });
    const file = e.target.files?.[0];
    if (!file || !activeConvId || !user) return;
    e.target.value = "";

    try {
      setActionError(null);
      setUploadProgressPct(0);

      const convKey = await resolveConversationKey(activeConvId);

      setSending(true);
      const uploaded = await uploadFile(file, "private-chat", (pct) => {
        setUploadProgressPct(pct);
        privateDebugLog("handleFileUpload:progress", { pct, file: file.name });
      });

      const isImage = file.type.startsWith("image/");
      const { ciphertext, iv } = await encryptMessage(
        `[${isImage ? "Image" : "File"}: ${file.name}]`,
        convKey
      );

      const token = await auth.currentUser?.getIdToken();
      const msgRes = await fetch(`/api/conversations/${activeConvId}/messages`, {
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
      if (!msgRes.ok) {
        const msgData = await msgRes.json().catch(() => ({} as { error?: string }));
        throw new Error(msgData.error || `Attachment message failed (HTTP ${msgRes.status})`);
      }
    } catch (err) {
      console.error("[ByteReaper] handleFileUpload:error", err);
      setActionError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setSending(false);
      setUploadProgressPct(0);
      privateDebugLog("handleFileUpload:end", { activeConvId });
    }
  };

  // ── Voice message ───────────────────────────────────────────

  const handleVoiceRecorded = async (file: File, durationSec: number) => {
    privateDebugLog("handleVoiceRecorded:start", {
      activeConvId,
      fileSize: file.size,
      durationSec,
    });
    if (!activeConvId || !user) return;

    try {
      setActionError(null);
      setUploadProgressPct(0);

      const convKey = await resolveConversationKey(activeConvId);

      setSending(true);
      const uploaded = await uploadFile(file, "private-chat", (pct) => {
        setUploadProgressPct(pct);
      });

      const { ciphertext, iv } = await encryptMessage(
        `[Voice message: ${durationSec}s]`,
        convKey
      );

      const token = await auth.currentUser?.getIdToken();
      const msgRes = await fetch(`/api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "voice",
          ciphertext,
          iv,
          attachment: {
            url: uploaded.url,
            publicId: uploaded.publicId,
            resourceType: uploaded.resourceType,
            bytes: uploaded.bytes,
            mime: file.type,
            originalName: file.name,
            durationSec,
          },
        }),
      });
      if (!msgRes.ok) {
        const msgData = await msgRes.json().catch(() => ({} as { error?: string }));
        throw new Error(msgData.error || `Voice message failed (HTTP ${msgRes.status})`);
      }
    } catch (err) {
      console.error("[ByteReaper] handleVoiceRecorded:error", err);
      setActionError(err instanceof Error ? err.message : "Voice message failed.");
    } finally {
      setSending(false);
      setUploadProgressPct(0);
      privateDebugLog("handleVoiceRecorded:end", { activeConvId });
    }
  };

  // ── Voice call ───────────────────────────────────────────

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConversation = async () => {
    if (!activeConvId || !user) return;
    setDeleting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/conversations/${activeConvId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setShowDeleteConfirm(false);
      setActiveConvId(null);
      setMessages([]);
    } catch (err) {
      console.error("Delete conversation error:", err);
      setActionError("Failed to delete conversation");
    } finally {
      setDeleting(false);
    }
  };

  const handleVoiceCall = async () => {
    privateDebugLog("handleVoiceCall:start", { activeConvId, hasUser: Boolean(user) });
    if (!activeConvId || !user || !activeConversation) return;
    const peerUid = activeConversation.participants.find((p) => p !== user.uid);
    if (!peerUid) return;

    const peerProfile = peerProfiles[peerUid];
    const peerName = peerProfile?.displayName || peerProfile?.username || "User";

    try {
      setActionError(null);
      const channelName = `br_${activeConvId}`;
      const convId = activeConvId;
      summarySentRef.current.delete(channelName);

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
      await joinVoiceChannel(channelName, activeConvId, peerName);

      // 60s timeout — if still ringing, mark as missed
      callerTimeoutRef.current = setTimeout(async () => {
        try {
          const callSnap = await getDoc(doc(db, "calls", channelName));
          if (callSnap.exists() && callSnap.data().status === "ringing") {
            await updateDoc(doc(db, "calls", channelName), {
              status: "missed",
              endedAt: serverTimestamp(),
            });
            await sendCallSummaryOnce(convId, channelName, "missed");
            await cleanupAgoraClient("caller-timeout");
            cleanupCallUI("caller-timeout");
          }
        } catch (e) {
          console.error("[ByteReaper] callerTimeout:error", e);
        }
        cleanupCallerListeners();
      }, 60_000);

      // Listen for callee response (rejected/accepted/ended)
      callerCallUnsubRef.current = onSnapshot(doc(db, "calls", channelName), async (snap) => {
        const data = snap.data();
        if (!data) return;
        if (data.status === "rejected") {
          cleanupCallerListeners();
          await sendCallSummaryOnce(convId, channelName, "declined");
          await cleanupAgoraClient("callee-rejected");
          cleanupCallUI("callee-rejected");
        } else if (data.status === "missed") {
          cleanupCallerListeners();
          await sendCallSummaryOnce(convId, channelName, "missed");
          await cleanupAgoraClient("callee-missed");
          cleanupCallUI("callee-missed");
        } else if (data.status === "accepted") {
          // Clear timeout — call is active now
          if (callerTimeoutRef.current) {
            clearTimeout(callerTimeoutRef.current);
            callerTimeoutRef.current = null;
          }
          const acceptedAtMs = Date.now();
          callAcceptedAtRef.current = acceptedAtMs;
          setCallStatus({ peerName, status: "connected" });
          setCallStartTime(acceptedAtMs);
        } else if (data.status === "ended" && activeCallChannelRef.current === channelName) {
          // Compute duration from local accept time to avoid server timestamp races.
          cleanupCallerListeners();
          const durationSec = computeCallDurationSec();
          await sendCallSummaryOnce(convId, channelName, "duration", durationSec);
          await cleanupAgoraClient("call-ended-normally");
          cleanupCallUI("call-ended-normally");
        }
      });
    } catch (err) {
      console.error("[ByteReaper] handleVoiceCall:error", err);
      setActionError(err instanceof Error ? err.message : "Voice call failed.");
      await cleanupAgoraClient("handleVoiceCall-error");
      cleanupCallUI("handleVoiceCall-error");
    } finally {
      privateDebugLog("handleVoiceCall:end", { activeConvId });
    }
  };

  const handleEndCall = async () => {
    const channelName = activeCallChannelRef.current;
    privateDebugLog("handleEndCall:start", { channelName });
    if (!channelName) return;

    try {
      const callSnap = await getDoc(doc(db, "calls", channelName));
      const callData = callSnap.exists()
        ? callSnap.data() as { conversationId?: string; status?: string }
        : null;
      const conversationId = callData?.conversationId || activeConvId;
      if (conversationId) {
        const durationSec = computeCallDurationSec();
        await sendCallSummaryOnce(
          conversationId,
          channelName,
          durationSec ? "duration" : "declined",
          durationSec
        );
      }
    } catch (readErr) {
      console.error("[ByteReaper] handleEndCall:read-call-error", readErr);
    }

    await updateDoc(doc(db, "calls", channelName), {
      status: "ended",
      endedAt: serverTimestamp(),
    }).catch((updateErr) => {
      console.error("[ByteReaper] handleEndCall:update-ended-error", updateErr);
    });

    cleanupCallerListeners();
    await cleanupAgoraClient("manual-end-call");
    cleanupCallUI("manual-end-call");
    privateDebugLog("handleEndCall:end");
  };

  // ── Typing indicator ────────────────────────────────────

  useEffect(() => {
    if (!activeConvId || !user || !inputText) return;
    const timeout = setTimeout(() => {
      updateDoc(doc(db, "conversations", activeConvId), {
        [`typing.${user.uid}`]: Date.now(),
      }).catch((err) => {
        console.error("[ByteReaper] typingIndicator:error", err);
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [inputText, activeConvId, user]);

  useEffect(() => {
    if (!user) return;

    privateDebugLog("incomingCallEffect:setup", { uid: user.uid });
    const callsQuery = query(collection(db, "calls"), where("calleeId", "==", user.uid));
    const unsubscribe = onSnapshot(
      callsQuery,
      async (snapshot) => {
        privateDebugLog("incomingCallEffect:snapshot", { count: snapshot.docs.length });

        for (const callDoc of snapshot.docs) {
          const callData = callDoc.data() as {
            channelName: string;
            conversationId: string;
            callerId: string;
            status: "ringing" | "accepted" | "rejected" | "ended" | "missed";
          };
          const isActiveCallChannel = callData.channelName === activeCallChannelRef.current;

          // Show incoming call modal instead of auto-accepting
          if (
            callData.status === "ringing" &&
            acceptedIncomingCallIdRef.current !== callDoc.id &&
            !isActiveCallChannel
          ) {
            acceptedIncomingCallIdRef.current = callDoc.id;
            const peerName =
              peerProfiles[callData.callerId]?.displayName ||
              peerProfiles[callData.callerId]?.username ||
              "User";

            setIncomingCall({
              callDocId: callDoc.id,
              channelName: callData.channelName,
              conversationId: callData.conversationId,
              callerId: callData.callerId,
              peerName,
            });
          }

          // Caller dismissed the call (missed/rejected) while we still show the modal
          if (
            (callData.status === "missed" || callData.status === "rejected") &&
            acceptedIncomingCallIdRef.current === callDoc.id
          ) {
            setIncomingCall(null);
            acceptedIncomingCallIdRef.current = null;
          }

          if (
            callData.status === "ended" &&
            activeCallChannelRef.current &&
            isActiveCallChannel
          ) {
            const durationSec = computeCallDurationSec();
            await sendCallSummaryOnce(
              callData.conversationId,
              callData.channelName,
              "duration",
              durationSec
            );
            cleanupCallerListeners();
            await cleanupAgoraClient("remote-ended-call");
            cleanupCallUI("remote-ended-call");
          }
        }
      },
      (err) => {
        console.error("[ByteReaper] incomingCallEffect:error", err);
      }
    );

    return () => {
      privateDebugLog("incomingCallEffect:cleanup", { uid: user.uid });
      unsubscribe();
    };
  }, [cleanupAgoraClient, cleanupCallUI, computeCallDurationSec, joinVoiceChannel, peerProfiles, sendCallSummaryOnce, user]);

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
  privateDebugLog("render:overlay", { hasStatus: Boolean(callStatus), status: callStatus?.status });

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Call overlay */}
      <AnimatePresence>
        {callStatus && (
          <VoiceCallOverlay
            peerName={callStatus.peerName}
            status={callStatus.status}
            startTime={callStartTime}
            onEnd={handleEndCall}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            isSpeakerOn={isSpeakerOn}
            onToggleSpeaker={toggleSpeaker}
          />
        )}
      </AnimatePresence>

      {/* Incoming call modal */}
      <AnimatePresence>
        {incomingCall && !callStatus && (
          <IncomingCallModal
            peerName={incomingCall.peerName}
            onAnswer={handleAnswerCall}
            onDecline={handleDeclineCall}
          />
        )}
      </AnimatePresence>

      {/* New conversation modal */}
      <AnimatePresence>
        {showNewConv && (
          <NewConversationModal
            onClose={() => { setShowNewConv(false); setStartChatError(null); }}
            onStartChat={handleStartChat}
            creating={creatingChat}
            startChatError={startChatError}
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title="Delete conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Delete confirmation dialog */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                  onClick={() => !deleting && setShowDeleteConfirm(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-background border border-border rounded-xl p-6 max-w-sm w-full shadow-xl space-y-4"
                  >
                    <h3 className="text-lg font-semibold">Delete conversation?</h3>
                    <p className="text-sm text-muted-foreground">
                      This will permanently delete all messages for both participants. This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteConversation}
                        disabled={deleting}
                      >
                        {deleting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Delete
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

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
                    peerUid={activeConversation?.participants.find((p) => p !== user.uid)}
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

                <div className="relative flex-1">
                  <Input
                    value={inputText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputText(val);
                      // Show popup when "@" is typed at end or after a space
                      const showPopup = /(^|[\s])@$/i.test(val) || val === "@";
                      setShowMentionPopup(showPopup);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && showMentionPopup) {
                        e.preventDefault();
                        setShowMentionPopup(false);
                        return;
                      }
                      if (e.key === "Enter" && !e.shiftKey) {
                        if (showMentionPopup) {
                          e.preventDefault();
                          // Select the mention on Enter
                          setInputText((prev) => prev.replace(/@$/, "@ByteReaper "));
                          setShowMentionPopup(false);
                          return;
                        }
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <AnimatePresence>
                    {showMentionPopup && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
                      >
                        <button
                          type="button"
                          className="flex items-center gap-2 px-3 py-2 w-full hover:bg-accent text-left text-sm"
                          onMouseDown={(e) => {
                            e.preventDefault(); // prevent input blur
                            setInputText((prev) => prev.replace(/@$/, "@ByteReaper "));
                            setShowMentionPopup(false);
                          }}
                        >
                          <Bot className="h-4 w-4 text-primary" />
                          <span className="font-medium">@ByteReaper</span>
                          <span className="text-muted-foreground text-xs">AI Assistant</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <VoiceRecorder
                  onRecorded={handleVoiceRecorded}
                  disabled={sending}
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
              {uploadProgressPct > 0 && (
                <p className="text-[10px] text-primary/70 mt-1 ml-11">
                  Uploading... {uploadProgressPct}%
                </p>
              )}
              {actionError && (
                <p className="text-[10px] text-destructive mt-1 ml-11">
                  {actionError}
                </p>
              )}
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

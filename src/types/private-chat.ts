import type { Timestamp, FieldValue } from "firebase/firestore";

// ─── User Profile ──────────────────────────────────────────

export interface UserProfile {
  uid: string;
  username: string;
  usernameLower: string;
  email: string;
  emailLower: string;
  displayName: string;
  photoURL?: string;
  publicKey: string; // base64 X25519 public key
  encryptedPrivateKey: string; // base64 encrypted private key
  privateKeySalt: string; // base64 salt for key derivation
  createdAt: Timestamp;
  lastSeen: Timestamp;
}

// ─── Conversation ──────────────────────────────────────────

export interface Conversation {
  id: string;
  participants: string[];
  participantsKey: string; // `${uidA}_${uidB}` sorted
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  lastMessagePreview: string;
  wrappedKeys: Record<string, string>; // uid -> base64 wrapped AES-256 key
  unread: Record<string, number>;
  typing: Record<string, number>;
}

// ─── Message ───────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  senderId: string;
  createdAt: Timestamp;
  type: "text" | "image" | "file" | "voice" | "ai" | "system";
  ciphertext: string; // base64 AES-GCM encrypted
  iv: string; // base64
  attachment?: {
    url: string;
    publicId: string;
    resourceType: "image" | "video" | "raw";
    bytes: number;
    mime: string;
    originalName: string;
  };
  aiMention?: {
    triggeredBy: string;
    model: string;
    status: "pending" | "done" | "error";
    errorMessage?: string;
  };
  readBy: string[];
}

// ─── Call ──────────────────────────────────────────────────

export interface VoiceCall {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  channelName: string;
  status: "ringing" | "accepted" | "rejected" | "ended" | "missed";
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  endedAt?: Timestamp;
  type: "voice";
}

// ─── Firestore write helpers ───────────────────────────────

export interface ConversationCreateData {
  participants: string[];
  participantsKey: string;
  createdAt: FieldValue;
  lastMessageAt: FieldValue;
  lastMessagePreview: string;
  wrappedKeys: Record<string, string>;
  unread: Record<string, number>;
  typing: Record<string, number>;
}

export interface MessageCreateData {
  senderId: string;
  createdAt: FieldValue;
  type: ChatMessage["type"];
  ciphertext: string;
  iv: string;
  attachment?: ChatMessage["attachment"];
  aiMention?: ChatMessage["aiMention"];
  readBy: string[];
}

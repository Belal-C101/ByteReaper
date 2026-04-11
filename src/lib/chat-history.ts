// Firestore Chat History Service — Single-Document Architecture
// Each chat session is a single document in `chat_session` containing all messages.
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { ChatMessage } from '@/types/chat';

const CHAT_SESSION_COLLECTION = 'chat_session';
const ARCHIVED_CHATS_COLLECTION = 'archived_chats';
const SHARED_CHATS_COLLECTION = 'shared_chats';
const USER_PROMPT_TEMPLATES_COLLECTION = 'user_prompt_templates';

/** Lightweight attachment metadata stored in Firestore (no binary content). */
export interface StoredAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
}

export interface StoredMediaLink {
  url: string;
  name: string;
  provider?: string;
}

export interface MessagePair {
  userMessage: string;
  response: string;
  model: string;
  timestamp: Timestamp | Date | string;
  userAttachments?: StoredAttachment[] | null;
  imageLinks?: StoredMediaLink[] | null;
  fileLinks?: StoredMediaLink[] | null;
  searchResults?: ChatMessage['searchResults'] | null;
  userMessageId: string;
  assistantMessageId: string;
  error?: string | null;
}

export interface ChatSession {
  id: string;
  userId: string;
  userEmail?: string;
  title: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isArchived: boolean;
  isDraft?: boolean;
}

export interface SharedChat {
  id: string;
  title: string;
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

interface SharedChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp | Date | string;
  searchResults?: ChatMessage['searchResults'] | null;
  error?: string | null;
}

interface PromptTemplateDocument {
  userId: string;
  templates: string[];
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

// ─── Helpers ───────────────────────────────────────────────

/**
 * Strip binary content from attachments to stay under Firestore's 1 MB document limit.
 * Only keep lightweight metadata (id, name, type, size).
 */
function sanitizeAttachmentsForStorage(
  attachments: ChatMessage['attachments'] | null | undefined
): StoredAttachment[] | null {
  if (!attachments || attachments.length === 0) return null;
  return attachments.map((a) => ({ id: a.id, name: a.name, type: a.type, size: a.size }));
}

function sanitizeMediaLinksForStorage(
  links: ChatMessage['imageLinks'] | ChatMessage['fileLinks'] | null | undefined
): StoredMediaLink[] {
  if (!links || links.length === 0) return [];

  return links
    .map((link) => ({
      url: typeof link.url === 'string' ? link.url.trim() : '',
      name: typeof link.name === 'string' && link.name.trim().length > 0 ? link.name.trim() : 'Attachment',
      provider: typeof link.provider === 'string' ? link.provider : undefined,
    }))
    .filter((link) => link.url.length > 0);
}

function parseFirestoreDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
}

function normalizeChatName(rawTitle: string): string {
  const normalized = rawTitle
    .replace(/[\\/#?\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized || normalized === '.' || normalized === '..') {
    return 'New Chat';
  }

  return normalized;
}

function sanitizePromptTemplates(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  ).slice(0, 20);
}

function serializeSharedMessage(message: ChatMessage): SharedChatMessage {
  return {
    role: message.role,
    content: message.content,
    timestamp: Timestamp.fromDate(message.timestamp),
    searchResults: message.searchResults ?? null,
    error: message.error ?? null,
  };
}

function deserializeSharedMessage(message: SharedChatMessage, idSeed: string, index: number): ChatMessage {
  return {
    id: `${idSeed}-${index}`,
    role: message.role,
    content: message.content,
    timestamp: parseFirestoreDate(message.timestamp),
    searchResults: message.searchResults ?? undefined,
    error: message.error ?? undefined,
    isStreaming: false,
  };
}

function toReadableFirestoreError(error: any, fallback: string): Error {
  const code = typeof error?.code === 'string' ? error.code.replace('firestore/', '') : null;
  const message = typeof error?.message === 'string' ? error.message : null;

  if (code && message) {
    return new Error(`${fallback} (${code}): ${message}`);
  }
  if (code) {
    return new Error(`${fallback} (${code})`);
  }
  return new Error(fallback);
}

function getFirestoreErrorCode(error: any): string {
  if (typeof error?.code === 'string') {
    return error.code;
  }
  if (typeof error?.message === 'string' && error.message.includes('permission-denied')) {
    return 'permission-denied';
  }
  return '';
}

function isPermissionDeniedError(error: any): boolean {
  const code = getFirestoreErrorCode(error);
  return code === 'permission-denied' || code === 'firestore/permission-denied';
}

function isNotFoundError(error: any): boolean {
  const code = getFirestoreErrorCode(error);
  return code === 'not-found' || code === 'firestore/not-found';
}

// ─── Unique Name Helpers ───────────────────────────────────

async function getExistingChatNameSet(userId: string): Promise<Set<string>> {
  const activeSnapshot = await getDocs(
    query(
      collection(db, CHAT_SESSION_COLLECTION),
      where('userId', '==', userId),
      limit(300)
    )
  );

  let archivedSnapshot = null as Awaited<ReturnType<typeof getDocs>> | null;

  try {
    archivedSnapshot = await getDocs(
      query(
        collection(db, ARCHIVED_CHATS_COLLECTION),
        where('userId', '==', userId),
        limit(300)
      )
    );
  } catch (error: any) {
    if (!isPermissionDeniedError(error)) {
      throw error;
    }
  }

  const names = new Set<string>();
  activeSnapshot.docs.forEach((d) => names.add(d.id));
  archivedSnapshot?.docs.forEach((d) => names.add(d.id));
  return names;
}

function buildUniqueChatName(baseName: string, existingNames: Set<string>, excludeName?: string): string {
  const normalizedExclude = excludeName ? normalizeChatName(excludeName) : undefined;

  if (baseName === normalizedExclude || !existingNames.has(baseName)) {
    return baseName;
  }

  let suffix = 2;
  while (existingNames.has(`${baseName} (${suffix})`)) {
    suffix += 1;
  }

  return `${baseName} (${suffix})`;
}

async function ensureUniqueChatName(userId: string, requestedTitle: string, excludeName?: string): Promise<string> {
  const normalizedTitle = normalizeChatName(requestedTitle);
  const existingNames = await getExistingChatNameSet(userId);
  return buildUniqueChatName(normalizedTitle, existingNames, excludeName);
}

// ─── Session Mapper ────────────────────────────────────────

function mapSessionDocToSession(sessionId: string, data: any, fallbackArchived = false): ChatSession {
  const messages = Array.isArray(data.messages) ? data.messages : [];
  return {
    id: sessionId,
    userId: data.userId,
    userEmail: typeof data.userEmail === 'string' ? data.userEmail : undefined,
    title: data.title ?? sessionId,
    model: data.model ?? 'auto',
    createdAt: parseFirestoreDate(data.createdAt),
    updatedAt: parseFirestoreDate(data.updatedAt ?? data.archivedAt),
    messageCount: messages.length * 2, // each pair = 2 messages (user + assistant)
    isArchived: typeof data.isArchived === 'boolean' ? data.isArchived : fallbackArchived,
  };
}

// ─── CRUD Operations ───────────────────────────────────────

/** Create a new chat session with an empty messages array. */
export async function createChatSession(
  userId: string,
  title: string,
  model: string,
  userEmail?: string | null
): Promise<string> {
  try {
    const uniqueTitle = await ensureUniqueChatName(userId, title);
    const sessionRef = doc(db, CHAT_SESSION_COLLECTION, uniqueTitle);

    const sessionData: Record<string, unknown> = {
      userId,
      title: uniqueTitle,
      model,
      messages: [],
      isArchived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (userEmail) sessionData.userEmail = userEmail;

    await setDoc(sessionRef, sessionData);

    return uniqueTitle;
  } catch (error: any) {
    console.error('Error creating chat session:', error);
    throw toReadableFirestoreError(error, 'Failed to create chat session');
  }
}

/** Get all active chat sessions for a user. */
export async function getChatSessions(userId: string): Promise<ChatSession[]> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, CHAT_SESSION_COLLECTION),
        where('userId', '==', userId),
        limit(300)
      )
    );

    return snapshot.docs
      .map((d) => mapSessionDocToSession(d.id, d.data(), false))
      .filter((session) => !session.isArchived)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error: any) {
    console.error('Error getting chat sessions:', error);
    return [];
  }
}

/** Get archived chat sessions for a user. */
export async function getArchivedChatSessions(userId: string): Promise<ChatSession[]> {
  try {
    const archivedSnapshot = await getDocs(
      query(
        collection(db, ARCHIVED_CHATS_COLLECTION),
        where('userId', '==', userId),
        limit(300)
      )
    );

    return archivedSnapshot.docs
      .map((d) => mapSessionDocToSession(d.id, d.data(), true))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error: any) {
    console.error('Error getting archived chat sessions:', error);
    return [];
  }
}

/** Get messages for a specific chat session by reading the single document. */
export async function getSessionMessages(sessionId: string, userId?: string): Promise<ChatMessage[]> {
  try {
    // Try the new chat_session collection first
    const sessionRef = doc(db, CHAT_SESSION_COLLECTION, sessionId);
    const sessionSnapshot = await getDoc(sessionRef);

    if (sessionSnapshot.exists()) {
      const data = sessionSnapshot.data();
      const messagePairs: MessagePair[] = Array.isArray(data.messages) ? data.messages : [];
      const chatMessages: ChatMessage[] = [];

      for (const pair of messagePairs) {
        const timestamp = parseFirestoreDate(pair.timestamp);

        if (typeof pair.userMessage === 'string' && pair.userMessage.trim()) {
          chatMessages.push({
            id: pair.userMessageId ?? `${sessionId}-user-${chatMessages.length}`,
            role: 'user',
            content: pair.userMessage,
            timestamp,
            attachments: pair.userAttachments ?? undefined,
            imageLinks: pair.imageLinks ?? undefined,
            fileLinks: pair.fileLinks ?? undefined,
            isStreaming: false,
          });
        }

        if (typeof pair.response === 'string' && pair.response.trim()) {
          chatMessages.push({
            id: pair.assistantMessageId ?? `${sessionId}-assistant-${chatMessages.length}`,
            role: 'assistant',
            content: pair.response,
            timestamp,
            searchResults: pair.searchResults ?? undefined,
            error: pair.error ?? undefined,
            isStreaming: false,
          });
        }
      }

      return chatMessages;
    }

    // Also check archived chats
    const archivedRef = doc(db, ARCHIVED_CHATS_COLLECTION, sessionId);
    const archivedSnapshot = await getDoc(archivedRef);

    if (archivedSnapshot.exists()) {
      const data = archivedSnapshot.data();
      const messagePairs: MessagePair[] = Array.isArray(data.messages) ? data.messages : [];
      const chatMessages: ChatMessage[] = [];

      for (const pair of messagePairs) {
        const timestamp = parseFirestoreDate(pair.timestamp);

        if (typeof pair.userMessage === 'string' && pair.userMessage.trim()) {
          chatMessages.push({
            id: pair.userMessageId ?? `${sessionId}-user-${chatMessages.length}`,
            role: 'user',
            content: pair.userMessage,
            timestamp,
            attachments: pair.userAttachments ?? undefined,
            imageLinks: pair.imageLinks ?? undefined,
            fileLinks: pair.fileLinks ?? undefined,
            isStreaming: false,
          });
        }

        if (typeof pair.response === 'string' && pair.response.trim()) {
          chatMessages.push({
            id: pair.assistantMessageId ?? `${sessionId}-assistant-${chatMessages.length}`,
            role: 'assistant',
            content: pair.response,
            timestamp,
            searchResults: pair.searchResults ?? undefined,
            error: pair.error ?? undefined,
            isStreaming: false,
          });
        }
      }

      return chatMessages;
    }

    return [];
  } catch (error: any) {
    console.error('Error getting session messages:', error);
    return [];
  }
}

/** Save a chat exchange by appending the message pair to the session document. */
export async function saveChatExchange(
  sessionId: string,
  userId: string,
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
  model: string,
  userEmail?: string | null
): Promise<void> {
  try {
    const sessionRef = doc(db, CHAT_SESSION_COLLECTION, sessionId);
    const existingSession = await getDoc(sessionRef);

    const exchangeTimestamp =
      assistantMessage.timestamp instanceof Date
        ? assistantMessage.timestamp
        : new Date(assistantMessage.timestamp);

    // CRITICAL: Strip binary content from attachments to stay under Firestore 1 MB limit.
    // Only store metadata (id, name, type, size) — not the base64 data URLs.
    // Build image/file link arrays from uploaded attachments
    const imageLinks = sanitizeMediaLinksForStorage(userMessage.imageLinks);
    const fileLinks = sanitizeMediaLinksForStorage(userMessage.fileLinks);

    const messagePair: MessagePair = {
      userMessage: userMessage.content,
      response: assistantMessage.content,
      model,
      timestamp: Timestamp.fromDate(exchangeTimestamp),
      userAttachments: sanitizeAttachmentsForStorage(userMessage.attachments),
      imageLinks: imageLinks.length > 0 ? imageLinks : null,
      fileLinks: fileLinks.length > 0 ? fileLinks : null,
      searchResults: assistantMessage.searchResults ?? null,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      error: assistantMessage.error ?? null,
    };

    if (!existingSession.exists()) {
      // Create the document with the first message pair
      const sessionData: Record<string, unknown> = {
        userId,
        title: sessionId,
        model,
        messages: [messagePair],
        isArchived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (userEmail) sessionData.userEmail = userEmail;

      await setDoc(sessionRef, sessionData);
    } else {
      // Read existing messages, push new pair, write back
      // (arrayUnion is unreliable with complex objects containing Timestamps)
      const existingData = existingSession.data();
      const existingMessages = Array.isArray(existingData.messages) ? [...existingData.messages] : [];
      existingMessages.push(messagePair);

      await updateDoc(sessionRef, {
        messages: existingMessages,
        model,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error: any) {
    console.error('Error saving chat exchange:', error);
    throw toReadableFirestoreError(error, 'Failed to save chat exchange');
  }
}

/** Update stored media links for one user message inside a chat session. */
export async function updateSessionUserMessageLinks(
  sessionId: string,
  userId: string,
  userMessageId: string,
  links: {
    imageLinks?: ChatMessage['imageLinks'];
    fileLinks?: ChatMessage['fileLinks'];
  }
): Promise<void> {
  try {
    const sessionRef = doc(db, CHAT_SESSION_COLLECTION, sessionId);
    const snapshot = await getDoc(sessionRef);

    if (!snapshot.exists()) {
      throw new Error('Chat session not found');
    }

    const data = snapshot.data();
    if (data.userId !== userId) {
      throw new Error('You do not have permission to update this chat session');
    }

    const existingMessages = Array.isArray(data.messages) ? [...data.messages] : [];
    const index = existingMessages.findIndex((pair: any) => pair?.userMessageId === userMessageId);
    if (index < 0) return;

    const nextPair = { ...existingMessages[index] };
    const normalizedImages = sanitizeMediaLinksForStorage(links.imageLinks);
    const normalizedFiles = sanitizeMediaLinksForStorage(links.fileLinks);

    nextPair.imageLinks = normalizedImages.length > 0 ? normalizedImages : null;
    nextPair.fileLinks = normalizedFiles.length > 0 ? normalizedFiles : null;

    existingMessages[index] = nextPair;

    await updateDoc(sessionRef, {
      messages: existingMessages,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error updating session user message links:', error);
    throw toReadableFirestoreError(error, 'Failed to update message links');
  }
}

/** Rename a chat session by creating a new doc and deleting the old one. */
export async function renameChatSession(sessionId: string, nextTitle: string, userId: string): Promise<string> {
  try {
    const oldRef = doc(db, CHAT_SESSION_COLLECTION, sessionId);
    const oldSnapshot = await getDoc(oldRef);

    if (!oldSnapshot.exists()) {
      throw new Error('Chat session not found');
    }

    if (oldSnapshot.data().userId !== userId) {
      throw new Error('You do not have permission to rename this chat');
    }

    const uniqueNextTitle = await ensureUniqueChatName(userId, nextTitle, sessionId);
    if (uniqueNextTitle === sessionId) {
      return sessionId;
    }

    const oldData = oldSnapshot.data();

    // Create new document with same data
    const newRef = doc(db, CHAT_SESSION_COLLECTION, uniqueNextTitle);
    await setDoc(newRef, {
      ...oldData,
      title: uniqueNextTitle,
      updatedAt: serverTimestamp(),
    });

    // Delete old document
    await deleteDoc(oldRef);

    // Also update archived copy if it exists
    const oldArchiveRef = doc(db, ARCHIVED_CHATS_COLLECTION, sessionId);
    try {
      const archiveSnapshot = await getDoc(oldArchiveRef);
      if (archiveSnapshot.exists()) {
        const archiveData = archiveSnapshot.data();
        await setDoc(doc(db, ARCHIVED_CHATS_COLLECTION, uniqueNextTitle), {
          ...archiveData,
          title: uniqueNextTitle,
          updatedAt: serverTimestamp(),
        });
        await deleteDoc(oldArchiveRef);
      }
    } catch (archiveError: any) {
      if (!isPermissionDeniedError(archiveError) && !isNotFoundError(archiveError)) {
        console.error('Error updating archive during rename:', archiveError);
      }
    }

    return uniqueNextTitle;
  } catch (error: any) {
    console.error('Error renaming chat session:', error);
    throw toReadableFirestoreError(error, 'Failed to rename chat session');
  }
}

/** Archive a chat session. */
export async function archiveChatSession(sessionId: string, userId: string): Promise<void> {
  try {
    const sessionRef = doc(db, CHAT_SESSION_COLLECTION, sessionId);
    const sessionSnapshot = await getDoc(sessionRef);

    if (!sessionSnapshot.exists()) {
      throw new Error('Chat session not found');
    }

    if (sessionSnapshot.data().userId !== userId) {
      throw new Error('You do not have permission to archive this chat');
    }

    const sessionData = sessionSnapshot.data();

    // Copy to archive collection
    await setDoc(doc(db, ARCHIVED_CHATS_COLLECTION, sessionId), {
      ...sessionData,
      isArchived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Mark as archived in main collection
    await updateDoc(sessionRef, {
      isArchived: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error archiving chat session:', error);
    throw toReadableFirestoreError(error, 'Failed to archive chat session');
  }
}

/** Restore an archived chat session. */
export async function restoreArchivedChatSession(sessionId: string, userId: string): Promise<void> {
  try {
    const archiveRef = doc(db, ARCHIVED_CHATS_COLLECTION, sessionId);
    const archiveSnapshot = await getDoc(archiveRef);

    if (!archiveSnapshot.exists()) {
      throw new Error('Archived chat not found');
    }

    const archiveData = archiveSnapshot.data();

    if (archiveData.userId !== userId) {
      throw new Error('You do not have permission to restore this chat');
    }

    // Restore to main collection
    const sessionRef = doc(db, CHAT_SESSION_COLLECTION, sessionId);
    await setDoc(sessionRef, {
      ...archiveData,
      isArchived: false,
      updatedAt: serverTimestamp(),
    });

    // Remove from archive
    await deleteDoc(archiveRef);
  } catch (error: any) {
    console.error('Error restoring archived chat session:', error);
    throw toReadableFirestoreError(error, 'Failed to restore archived chat');
  }
}

/** Delete a chat session entirely. */
export async function deleteChatSession(sessionId: string, userId?: string): Promise<void> {
  try {
    // Delete from main collection
    await deleteDoc(doc(db, CHAT_SESSION_COLLECTION, sessionId)).catch((error: any) => {
      if (!isNotFoundError(error) && !isPermissionDeniedError(error)) {
        throw error;
      }
    });

    // Delete from archive if exists
    await deleteDoc(doc(db, ARCHIVED_CHATS_COLLECTION, sessionId)).catch((error: any) => {
      if (!isNotFoundError(error) && !isPermissionDeniedError(error)) {
        throw error;
      }
    });
  } catch (error: any) {
    console.error('Error deleting chat session:', error);
    throw toReadableFirestoreError(error, 'Failed to delete chat session');
  }
}

/** Create a publicly shareable snapshot of the current chat messages. */
export async function createSharedChat(
  userId: string,
  title: string,
  messages: ChatMessage[]
): Promise<string> {
  try {
    const sharedRef = doc(collection(db, SHARED_CHATS_COLLECTION));
    const serializedMessages = messages
      .filter((message) => typeof message.content === 'string' && message.content.trim().length > 0)
      .map((message) => serializeSharedMessage(message));

    await setDoc(sharedRef, {
      ownerId: userId,
      title: normalizeChatName(title),
      isPublic: true,
      messages: serializedMessages,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return sharedRef.id;
  } catch (error: any) {
    console.error('Error creating shared chat:', error);
    throw toReadableFirestoreError(error, 'Failed to create shared chat link');
  }
}

/** Fetch a shared chat snapshot. This can be called without authentication. */
export async function getSharedChat(shareId: string): Promise<SharedChat | null> {
  try {
    const snapshot = await getDoc(doc(db, SHARED_CHATS_COLLECTION, shareId));
    if (!snapshot.exists()) return null;

    const data = snapshot.data();
    if (data.isPublic !== true) return null;

    const storedMessages = Array.isArray(data.messages) ? (data.messages as SharedChatMessage[]) : [];

    return {
      id: snapshot.id,
      title: typeof data.title === 'string' ? data.title : 'Shared chat',
      ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
      createdAt: parseFirestoreDate(data.createdAt),
      updatedAt: parseFirestoreDate(data.updatedAt ?? data.createdAt),
      messages: storedMessages.map((message, index) => deserializeSharedMessage(message, snapshot.id, index)),
    };
  } catch (error: any) {
    console.error('Error loading shared chat:', error);
    return null;
  }
}

/** Load user-defined prompt templates from Firestore. */
export async function getUserPromptTemplates(userId: string): Promise<string[]> {
  try {
    const snapshot = await getDoc(doc(db, USER_PROMPT_TEMPLATES_COLLECTION, userId));
    if (!snapshot.exists()) return [];

    const data = snapshot.data() as PromptTemplateDocument;
    const templates = Array.isArray(data.templates)
      ? data.templates.filter((item) => typeof item === 'string')
      : [];

    return sanitizePromptTemplates(templates);
  } catch (error: any) {
    console.error('Error getting prompt templates:', error);
    return [];
  }
}

/** Save a custom prompt template and return the updated template list. */
export async function saveUserPromptTemplate(userId: string, template: string): Promise<string[]> {
  try {
    const current = await getUserPromptTemplates(userId);
    const next = sanitizePromptTemplates([template, ...current]);

    await setDoc(doc(db, USER_PROMPT_TEMPLATES_COLLECTION, userId), {
      userId,
      templates: next,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });

    return next;
  } catch (error: any) {
    console.error('Error saving prompt template:', error);
    throw toReadableFirestoreError(error, 'Failed to save prompt template');
  }
}

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

export interface MessagePair {
  userMessage: string;
  response: string;
  model: string;
  timestamp: Timestamp | Date | string;
  userAttachments?: ChatMessage['attachments'] | null;
  searchResults?: ChatMessage['searchResults'] | null;
  userMessageId: string;
  assistantMessageId: string;
  error?: string | null;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isArchived: boolean;
  isDraft?: boolean;
}

// ─── Helpers ───────────────────────────────────────────────

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
export async function createChatSession(userId: string, title: string, model: string): Promise<string> {
  try {
    const uniqueTitle = await ensureUniqueChatName(userId, title);
    const sessionRef = doc(db, CHAT_SESSION_COLLECTION, uniqueTitle);

    await setDoc(sessionRef, {
      userId,
      title: uniqueTitle,
      model,
      messages: [],
      isArchived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

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
  model: string
): Promise<void> {
  try {
    const sessionRef = doc(db, CHAT_SESSION_COLLECTION, sessionId);
    const existingSession = await getDoc(sessionRef);

    const exchangeTimestamp =
      assistantMessage.timestamp instanceof Date
        ? assistantMessage.timestamp
        : new Date(assistantMessage.timestamp);

    const messagePair: MessagePair = {
      userMessage: userMessage.content,
      response: assistantMessage.content,
      model,
      timestamp: Timestamp.fromDate(exchangeTimestamp),
      userAttachments: userMessage.attachments ?? null,
      searchResults: assistantMessage.searchResults ?? null,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      error: assistantMessage.error ?? null,
    };

    if (!existingSession.exists()) {
      // Create the document with the first message pair
      await setDoc(sessionRef, {
        userId,
        title: sessionId,
        model,
        messages: [messagePair],
        isArchived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
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

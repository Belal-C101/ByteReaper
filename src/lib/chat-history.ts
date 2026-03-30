// Firestore Chat History Service
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { ChatMessage } from '@/types/chat';

const CHAT_SESSIONS_COLLECTION = 'chatSessions';
const CHAT_MESSAGES_COLLECTION = 'chatMessages';
const ARCHIVED_CHATS_COLLECTION = 'archive chats';

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

interface MessagePairRecord {
  userMessage?: string;
  response?: string;
  model?: string;
  timestamp?: Timestamp | Date | string;
  userAttachments?: ChatMessage['attachments'] | null;
  searchResults?: ChatMessage['searchResults'] | null;
  userMessageId?: string;
  assistantMessageId?: string;
  error?: string | null;
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
    .replace(/[\/#?\[\]]/g, ' ')
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

function toObjectRecord(value: unknown): Record<string, any> {
  if (value && typeof value === 'object') {
    return value as Record<string, any>;
  }

  return {};
}

async function getExistingChatNameSet(userId: string): Promise<Set<string>> {
  const activeSnapshot = await getDocs(
    query(
      collection(db, CHAT_SESSIONS_COLLECTION),
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
    const errorCode = typeof error?.code === 'string' ? error.code : '';
    if (errorCode !== 'permission-denied' && errorCode !== 'firestore/permission-denied') {
      throw error;
    }
  }

  const names = new Set<string>();
  activeSnapshot.docs.forEach((sessionDoc) => names.add(sessionDoc.id));
  archivedSnapshot?.docs.forEach((sessionDoc) => names.add(sessionDoc.id));

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

function mapSessionDocToSession(sessionId: string, data: any, fallbackArchived = false): ChatSession {
  return {
    id: sessionId,
    userId: data.userId,
    title: data.title ?? sessionId,
    model: data.model ?? 'auto',
    createdAt: parseFirestoreDate(data.createdAt),
    updatedAt: parseFirestoreDate(data.updatedAt ?? data.archivedAt),
    messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0,
    isArchived: typeof data.isArchived === 'boolean' ? data.isArchived : fallbackArchived,
  };
}

async function getLegacySessionMessages(sessionId: string, userId?: string): Promise<ChatMessage[]> {
  const constraints = [where('sessionId', '==', sessionId)];
  if (userId) {
    constraints.push(where('userId', '==', userId));
  }

  const legacySnapshot = await getDocs(
    query(collection(db, CHAT_MESSAGES_COLLECTION), ...constraints, limit(500))
  );

  return legacySnapshot.docs
    .map((legacyDoc) => {
      const data = legacyDoc.data();
      return {
        id: data.id ?? legacyDoc.id,
        role: data.role,
        content: data.content,
        timestamp: parseFirestoreDate(data.timestamp),
        attachments: data.attachments ?? undefined,
        searchResults: data.searchResults ?? undefined,
        isStreaming: false,
      } as ChatMessage;
    })
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

async function deleteCollectionInChunks(collectionPath: string[]): Promise<void> {
  const chunkSize = 350;

  while (true) {
    const targetCollection = collection(db, collectionPath.join('/'));
    const snapshot = await getDocs(query(targetCollection, limit(chunkSize)));

    if (snapshot.empty) {
      break;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((itemDoc) => batch.delete(itemDoc.ref));
    await batch.commit();

    if (snapshot.size < chunkSize) {
      break;
    }
  }
}

// Create a new chat session where document ID equals chat name
export async function createChatSession(userId: string, title: string, model: string): Promise<string> {
  try {
    const uniqueTitle = await ensureUniqueChatName(userId, title);
    const sessionRef = doc(db, CHAT_SESSIONS_COLLECTION, uniqueTitle);

    await setDoc(sessionRef, {
      userId,
      title: uniqueTitle,
      model,
      messageCount: 0,
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

// Get all active chat sessions for a user
export async function getChatSessions(userId: string): Promise<ChatSession[]> {
  try {
    const sessionsSnapshot = await getDocs(
      query(
        collection(db, CHAT_SESSIONS_COLLECTION),
        where('userId', '==', userId),
        limit(300)
      )
    );

    return sessionsSnapshot.docs
      .map((sessionDoc) => mapSessionDocToSession(sessionDoc.id, sessionDoc.data(), false))
      .filter((session) => !session.isArchived)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error: any) {
    console.error('Error getting chat sessions:', error);
    return [];
  }
}

// Get archived chat sessions for a user from the dedicated archive collection
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
      .map((sessionDoc) => mapSessionDocToSession(sessionDoc.id, sessionDoc.data(), true))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error: any) {
    console.error('Error getting archived chat sessions:', error);
    return [];
  }
}

// Get messages for a specific chat session.
// New format: chatMessages/{chatName}/messages/{messageDoc}
// Legacy fallback: top-level chatMessages documents with role/content.
export async function getSessionMessages(sessionId: string, userId?: string): Promise<ChatMessage[]> {
  try {
    const modernSnapshot = await getDocs(
      query(collection(db, CHAT_MESSAGES_COLLECTION, sessionId, 'messages'), limit(600))
    );

    if (!modernSnapshot.empty) {
      const messages: ChatMessage[] = [];

      modernSnapshot.docs.forEach((messageDoc) => {
        const data = messageDoc.data() as MessagePairRecord;
        const timestamp = parseFirestoreDate(data.timestamp);

        if (typeof data.userMessage === 'string' && data.userMessage.trim()) {
          messages.push({
            id: data.userMessageId ?? `${messageDoc.id}-user`,
            role: 'user',
            content: data.userMessage,
            timestamp,
            attachments: data.userAttachments ?? undefined,
            isStreaming: false,
          });
        }

        if (typeof data.response === 'string' && data.response.trim()) {
          messages.push({
            id: data.assistantMessageId ?? `${messageDoc.id}-assistant`,
            role: 'assistant',
            content: data.response,
            timestamp,
            searchResults: data.searchResults ?? undefined,
            error: data.error ?? undefined,
            isStreaming: false,
          });
        }
      });

      return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }

    return await getLegacySessionMessages(sessionId, userId);
  } catch (error: any) {
    console.error('Error getting session messages:', error);
    return [];
  }
}

export async function saveChatExchange(
  sessionId: string,
  userId: string,
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
  model: string
): Promise<void> {
  try {
    const sessionRef = doc(db, CHAT_SESSIONS_COLLECTION, sessionId);
    const existingSession = await getDoc(sessionRef);

    if (!existingSession.exists()) {
      await setDoc(sessionRef, {
        userId,
        title: sessionId,
        model,
        messageCount: 0,
        isArchived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const threadRef = doc(db, CHAT_MESSAGES_COLLECTION, sessionId);
    await setDoc(
      threadRef,
      {
        userId,
        title: sessionId,
        isArchived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const exchangeTimestamp =
      assistantMessage.timestamp instanceof Date
        ? assistantMessage.timestamp
        : new Date(assistantMessage.timestamp);

    await addDoc(collection(db, CHAT_MESSAGES_COLLECTION, sessionId, 'messages'), {
      userId,
      sessionId,
      userMessage: userMessage.content,
      response: assistantMessage.content,
      model,
      timestamp: Timestamp.fromDate(exchangeTimestamp),
      userAttachments: userMessage.attachments ?? null,
      searchResults: assistantMessage.searchResults ?? null,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      error: assistantMessage.error ?? null,
    });

    await updateDoc(sessionRef, {
      userId,
      title: sessionId,
      model,
      isArchived: false,
      updatedAt: serverTimestamp(),
      messageCount: increment(2),
    });

    await setDoc(
      threadRef,
      {
        userId,
        title: sessionId,
        updatedAt: serverTimestamp(),
        isArchived: false,
        messageCount: increment(2),
      },
      { merge: true }
    );
  } catch (error: any) {
    console.error('Error saving chat exchange:', error);
    throw toReadableFirestoreError(error, 'Failed to save chat exchange');
  }
}

// Rename a chat session by moving document IDs in chatSessions/chatMessages/archive chats.
export async function renameChatSession(sessionId: string, nextTitle: string, userId: string): Promise<string> {
  try {
    const oldSessionRef = doc(db, CHAT_SESSIONS_COLLECTION, sessionId);
    const oldSessionSnapshot = await getDoc(oldSessionRef);

    if (!oldSessionSnapshot.exists()) {
      throw new Error('Chat session not found');
    }

    if (oldSessionSnapshot.data().userId !== userId) {
      throw new Error('You do not have permission to rename this chat');
    }

    const uniqueNextTitle = await ensureUniqueChatName(userId, nextTitle, sessionId);
    if (uniqueNextTitle === sessionId) {
      return sessionId;
    }

    const oldThreadRef = doc(db, CHAT_MESSAGES_COLLECTION, sessionId);
    let oldThreadSnapshot: Awaited<ReturnType<typeof getDoc>> | null = null;

    try {
      oldThreadSnapshot = await getDoc(oldThreadRef);
    } catch (threadReadError: any) {
      if (!isPermissionDeniedError(threadReadError)) {
        throw threadReadError;
      }
    }

    const oldArchiveRef = doc(db, ARCHIVED_CHATS_COLLECTION, sessionId);
    let oldArchiveSnapshot: Awaited<ReturnType<typeof getDoc>> | null = null;

    try {
      oldArchiveSnapshot = await getDoc(oldArchiveRef);
    } catch (archiveReadError: any) {
      if (!isPermissionDeniedError(archiveReadError)) {
        throw archiveReadError;
      }
    }

    const createTargetsBatch = writeBatch(db);

    createTargetsBatch.set(doc(db, CHAT_SESSIONS_COLLECTION, uniqueNextTitle), {
      ...oldSessionSnapshot.data(),
      title: uniqueNextTitle,
      updatedAt: serverTimestamp(),
    });

    const oldThreadData = oldThreadSnapshot?.exists() ? toObjectRecord(oldThreadSnapshot.data()) : null;
    if (oldThreadData) {
      createTargetsBatch.set(doc(db, CHAT_MESSAGES_COLLECTION, uniqueNextTitle), {
        ...oldThreadData,
        title: uniqueNextTitle,
        updatedAt: serverTimestamp(),
      });
    } else {
      createTargetsBatch.set(
        doc(db, CHAT_MESSAGES_COLLECTION, uniqueNextTitle),
        {
          userId,
          title: uniqueNextTitle,
          messageCount: oldSessionSnapshot.data().messageCount ?? 0,
          isArchived: oldSessionSnapshot.data().isArchived ?? false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    const oldArchiveData = oldArchiveSnapshot?.exists() ? toObjectRecord(oldArchiveSnapshot.data()) : null;
    if (oldArchiveData) {
      createTargetsBatch.set(doc(db, ARCHIVED_CHATS_COLLECTION, uniqueNextTitle), {
        ...oldArchiveData,
        title: uniqueNextTitle,
        updatedAt: serverTimestamp(),
      });
    }

    await createTargetsBatch.commit();

    // Move grouped message documents to the new session ID.
    const oldMessagesSnapshot = await getDocs(collection(db, CHAT_MESSAGES_COLLECTION, sessionId, 'messages'));

    if (!oldMessagesSnapshot.empty) {
      const chunkSize = 350;

      for (let start = 0; start < oldMessagesSnapshot.docs.length; start += chunkSize) {
        const chunk = oldMessagesSnapshot.docs.slice(start, start + chunkSize);
        const moveBatch = writeBatch(db);

        chunk.forEach((messageDoc) => {
          const data = messageDoc.data();
          moveBatch.set(
            doc(db, CHAT_MESSAGES_COLLECTION, uniqueNextTitle, 'messages', messageDoc.id),
            {
              ...data,
              sessionId: uniqueNextTitle,
            }
          );
          moveBatch.delete(messageDoc.ref);
        });

        await moveBatch.commit();
      }
    }

    const cleanupBatch = writeBatch(db);
    cleanupBatch.delete(oldSessionRef);

    if (oldThreadData) {
      cleanupBatch.delete(oldThreadRef);
    }

    if (oldArchiveData) {
      cleanupBatch.delete(oldArchiveRef);
    }

    await cleanupBatch.commit();

    return uniqueNextTitle;
  } catch (error: any) {
    console.error('Error renaming chat session:', error);
    throw toReadableFirestoreError(error, 'Failed to rename chat session');
  }
}

// Archive chat: mark in chatSessions and copy metadata to `archive chats` collection.
export async function archiveChatSession(sessionId: string, userId: string): Promise<void> {
  try {
    const sessionRef = doc(db, CHAT_SESSIONS_COLLECTION, sessionId);
    const sessionSnapshot = await getDoc(sessionRef);

    if (!sessionSnapshot.exists()) {
      throw new Error('Chat session not found');
    }

    if (sessionSnapshot.data().userId !== userId) {
      throw new Error('You do not have permission to archive this chat');
    }

    const archiveBatch = writeBatch(db);

    archiveBatch.set(doc(db, ARCHIVED_CHATS_COLLECTION, sessionId), {
      ...sessionSnapshot.data(),
      title: sessionId,
      isArchived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    archiveBatch.set(
      sessionRef,
      {
        userId,
        title: sessionId,
        isArchived: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    archiveBatch.set(
      doc(db, CHAT_MESSAGES_COLLECTION, sessionId),
      {
        userId,
        title: sessionId,
        isArchived: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    try {
      await archiveBatch.commit();
    } catch (archiveCommitError: any) {
      if (!isPermissionDeniedError(archiveCommitError)) {
        throw archiveCommitError;
      }

      await setDoc(
        sessionRef,
        {
          userId,
          title: sessionId,
          isArchived: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error: any) {
    console.error('Error archiving chat session:', error);
    throw toReadableFirestoreError(error, 'Failed to archive chat session');
  }
}

// Restore archived chat back to active list.
export async function restoreArchivedChatSession(sessionId: string, userId: string): Promise<void> {
  try {
    const archiveRef = doc(db, ARCHIVED_CHATS_COLLECTION, sessionId);
    let archiveSnapshot: Awaited<ReturnType<typeof getDoc>> | null = null;

    try {
      archiveSnapshot = await getDoc(archiveRef);
    } catch (archiveReadError: any) {
      if (!isPermissionDeniedError(archiveReadError)) {
        throw archiveReadError;
      }
    }

    const archivedRecord = archiveSnapshot?.exists() ? toObjectRecord(archiveSnapshot.data()) : null;

    if (archivedRecord && archivedRecord.userId !== userId) {
      throw new Error('You do not have permission to restore this chat');
    }

    const sessionRef = doc(db, CHAT_SESSIONS_COLLECTION, sessionId);
    const sessionSnapshot = await getDoc(sessionRef);

    const restoreBatch = writeBatch(db);

    if (sessionSnapshot.exists()) {
      restoreBatch.set(
        sessionRef,
        {
          userId,
          title: sessionId,
          isArchived: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else if (archivedRecord) {
      restoreBatch.set(sessionRef, {
        ...archivedRecord,
        title: sessionId,
        isArchived: false,
        updatedAt: serverTimestamp(),
      });
    } else {
      throw new Error('Archived chat not found');
    }

    if (archiveSnapshot?.exists()) {
      restoreBatch.delete(archiveRef);
    }

    restoreBatch.set(
      doc(db, CHAT_MESSAGES_COLLECTION, sessionId),
      {
        userId,
        title: sessionId,
        isArchived: false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    try {
      await restoreBatch.commit();
    } catch (restoreCommitError: any) {
      if (!isPermissionDeniedError(restoreCommitError)) {
        throw restoreCommitError;
      }

      await setDoc(
        sessionRef,
        {
          userId,
          title: sessionId,
          isArchived: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error: any) {
    console.error('Error restoring archived chat session:', error);
    throw toReadableFirestoreError(error, 'Failed to restore archived chat');
  }
}

// Delete session metadata and both modern + legacy message structures.
export async function deleteChatSession(sessionId: string, userId?: string): Promise<void> {
  try {
    await deleteCollectionInChunks([CHAT_MESSAGES_COLLECTION, sessionId, 'messages']);

    const legacyConstraints = [where('sessionId', '==', sessionId)];
    if (userId) {
      legacyConstraints.push(where('userId', '==', userId));
    }

    const legacySnapshot = await getDocs(
      query(collection(db, CHAT_MESSAGES_COLLECTION), ...legacyConstraints, limit(600))
    );

    if (!legacySnapshot.empty) {
      const legacyBatch = writeBatch(db);
      legacySnapshot.docs.forEach((legacyDoc) => legacyBatch.delete(legacyDoc.ref));
      await legacyBatch.commit();
    }

    await deleteDoc(doc(db, CHAT_MESSAGES_COLLECTION, sessionId)).catch((error: any) => {
      if (!isNotFoundError(error) && !isPermissionDeniedError(error)) {
        throw error;
      }
    });

    await deleteDoc(doc(db, ARCHIVED_CHATS_COLLECTION, sessionId)).catch((error: any) => {
      if (!isNotFoundError(error) && !isPermissionDeniedError(error)) {
        throw error;
      }
    });

    await deleteDoc(doc(db, CHAT_SESSIONS_COLLECTION, sessionId));
  } catch (error: any) {
    console.error('Error deleting chat session:', error);
    throw toReadableFirestoreError(error, 'Failed to delete chat session');
  }
}

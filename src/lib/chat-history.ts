// Firestore Chat History Service
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  limit,
  Timestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { ChatMessage } from '@/types/chat';

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface StoredChatMessage extends ChatMessage {
  sessionId: string;
  userId: string;
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

// Create a new chat session
export async function createChatSession(userId: string, title: string, model: string): Promise<string> {
  try {
    const now = Timestamp.now();
    const sessionRef = await addDoc(collection(db, 'chatSessions'), {
      userId,
      title,
      model,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    });
    return sessionRef.id;
  } catch (error: any) {
    console.error('Error creating chat session:', error);
    throw toReadableFirestoreError(error, 'Failed to create chat session');
  }
}

// Get all chat sessions for a user
export async function getChatSessions(userId: string): Promise<ChatSession[]> {
  try {
    const q = query(
      collection(db, 'chatSessions'),
      where('userId', '==', userId),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    const sessions = querySnapshot.docs.map((sessionDoc) => {
      const data = sessionDoc.data();

      return {
        id: sessionDoc.id,
        userId: data.userId,
        title: data.title,
        model: data.model,
        createdAt: parseFirestoreDate(data.createdAt),
        updatedAt: parseFirestoreDate(data.updatedAt),
        messageCount: typeof data.messageCount === 'number' ? data.messageCount : 0,
      } as ChatSession;
    });

    return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (error: any) {
    console.error('Error getting chat sessions:', error);
    return [];
  }
}

// Get messages for a specific session
export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  try {
    const q = query(
      collection(db, 'chatMessages'),
      where('sessionId', '==', sessionId)
    );
    
    const querySnapshot = await getDocs(q);
    const messages = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        role: data.role,
        content: data.content,
        timestamp: parseFirestoreDate(data.timestamp),
        attachments: data.attachments,
        searchResults: data.searchResults,
        isStreaming: false,
      } as ChatMessage;
    });

    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  } catch (error: any) {
    console.error('Error getting session messages:', error);
    return [];
  }
}

// Save a message to a session
export async function saveMessage(
  sessionId: string,
  userId: string,
  message: ChatMessage
): Promise<void> {
  try {
    const messageDate = message.timestamp instanceof Date
      ? message.timestamp
      : new Date(message.timestamp);

    // Save the message
    await addDoc(collection(db, 'chatMessages'), {
      sessionId,
      userId,
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: Timestamp.fromDate(messageDate),
      attachments: message.attachments || null,
      searchResults: message.searchResults || null,
    });

    // Update session's updatedAt and message count
    await updateDoc(doc(db, 'chatSessions', sessionId), {
      updatedAt: Timestamp.now(),
      messageCount: increment(1),
    });
  } catch (error: any) {
    console.error('Error saving message:', error);
    throw toReadableFirestoreError(error, 'Failed to save message');
  }
}

// Delete a chat session and all its messages
export async function deleteChatSession(sessionId: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Delete all messages in the session
    const messagesQuery = query(
      collection(db, 'chatMessages'),
      where('sessionId', '==', sessionId)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    messagesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the session
    batch.delete(doc(db, 'chatSessions', sessionId));

    await batch.commit();
  } catch (error: any) {
    console.error('Error deleting chat session:', error);
    throw new Error('Failed to delete chat session');
  }
}

// Update session title
export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'chatSessions', sessionId), {
      title,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error('Error updating session title:', error);
    throw toReadableFirestoreError(error, 'Failed to update session title');
  }
}

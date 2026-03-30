// Firestore Chat History Service
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { ChatMessage } from '@/types/chat';

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface StoredChatMessage extends ChatMessage {
  sessionId: string;
  userId: string;
}

// Create a new chat session
export async function createChatSession(userId: string, title: string, model: string): Promise<string> {
  try {
    const sessionRef = await addDoc(collection(db, 'chatSessions'), {
      userId,
      title,
      model,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    });
    return sessionRef.id;
  } catch (error: any) {
    console.error('Error creating chat session:', error);
    throw new Error('Failed to create chat session');
  }
}

// Get all chat sessions for a user
export async function getChatSessions(userId: string): Promise<ChatSession[]> {
  try {
    const q = query(
      collection(db, 'chatSessions'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChatSession));
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
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        role: data.role,
        content: data.content,
        timestamp: new Date(data.timestamp),
        attachments: data.attachments,
        searchResults: data.searchResults,
        isStreaming: false,
      } as ChatMessage;
    });
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
    // Save the message
    await addDoc(collection(db, 'chatMessages'), {
      sessionId,
      userId,
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      attachments: message.attachments || null,
      searchResults: message.searchResults || null,
    });

    // Update session's updatedAt and message count
    const sessionRef = doc(db, 'chatSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (sessionDoc.exists()) {
      const currentCount = sessionDoc.data().messageCount || 0;
      await updateDoc(sessionRef, {
        updatedAt: new Date().toISOString(),
        messageCount: currentCount + 1,
      });
    }
  } catch (error: any) {
    console.error('Error saving message:', error);
    throw new Error('Failed to save message');
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
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error updating session title:', error);
    throw new Error('Failed to update session title');
  }
}

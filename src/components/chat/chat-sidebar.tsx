"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, Trash2, Loader2, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatSession, getChatSessions, deleteChatSession, createChatSession } from "@/lib/chat-history";
import { useAuth } from "@/contexts/AuthContext";

interface ChatSidebarProps {
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ currentSessionId, onSessionSelect, onNewChat }: ChatSidebarProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  // Load sessions
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userSessions = await getChatSessions(user.uid);
      setSessions(userSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this chat?')) {
      return;
    }

    try {
      await deleteChatSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      // If deleted session was active, trigger new chat
      if (sessionId === currentSessionId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleNewChat = async () => {
    if (!user) return;

    try {
      const newSessionId = await createChatSession(user.uid, 'New Chat', 'auto');
      await loadSessions();
      onSessionSelect(newSessionId);
      onNewChat();
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  if (!isOpen) {
    return (
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(true)}
          title="Open sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat History
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsOpen(false)}
          title="Close sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No chat history yet
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              className={cn(
                "group flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                "hover:bg-accent",
                currentSessionId === session.id && "bg-accent"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{session.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(session.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDeleteSession(session.id, e)}
                title="Delete chat"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

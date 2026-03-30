"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, Search, Github, Loader2, X, Bot, User, FileCode, Image as ImageIcon, File, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChatMessage, FileAttachment, SearchResult } from "@/types/chat";
import { useAuth } from "@/contexts/AuthContext";
import { createChatSession, saveMessage, getSessionMessages } from "@/lib/chat-history";
import { ChatSidebar } from "./chat-sidebar";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Available AI Models (must match server-side) - All FREE on OpenRouter
const AI_MODELS = {
  'auto': { name: 'Auto (Free Router)', description: '🎲 Auto-select', provider: 'OpenRouter' },
  'nemotron': { name: 'Nemotron 3 Super 120B', description: '🚀 Powerful', provider: 'NVIDIA' },
  'minimax': { name: 'MiniMax M2.5', description: '⚡ Fast', provider: 'MiniMax' },
  'step-flash': { name: 'Step 3.5 Flash', description: '🧠 Reasoning', provider: 'StepFun' },
  'trinity': { name: 'Trinity Large 400B', description: '✨ Creative', provider: 'Arcee AI' },
  'liquid-think': { name: 'LFM 2.5 Thinking', description: '💭 Thinking', provider: 'LiquidAI' },
  'liquid': { name: 'LFM 2.5 Instruct', description: '📝 Instruct', provider: 'LiquidAI' },
} as const;

type ModelKey = keyof typeof AI_MODELS;

// File type detection
function getFileType(file: File): 'code' | 'image' | 'text' | 'other' {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'json', 'md', 'yaml', 'yml', 'sql', 'sh', 'bash', 'go', 'rs', 'rb', 'php'];
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  
  if (codeExts.includes(ext)) return 'code';
  if (imageExts.includes(ext)) return 'image';
  if (file.type.startsWith('text/')) return 'text';
  return 'other';
}

// File icon component
function FileIcon({ type }: { type: 'code' | 'image' | 'text' | 'other' }) {
  switch (type) {
    case 'code': return <FileCode className="h-4 w-4" />;
    case 'image': return <ImageIcon className="h-4 w-4" />;
    default: return <File className="h-4 w-4" />;
  }
}

// Model Selector Component
function ModelSelector({ 
  selectedModel, 
  onSelect,
  disabled 
}: { 
  selectedModel: ModelKey; 
  onSelect: (model: ModelKey) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const model = AI_MODELS[selectedModel];

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="gap-2 min-w-[180px] justify-between"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs">{model.description}</span>
          <span className="font-medium">{model.name}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border rounded-lg shadow-lg z-20 py-1">
            {(Object.entries(AI_MODELS) as [ModelKey, typeof AI_MODELS[ModelKey]][]).map(([key, m]) => (
              <button
                key={key}
                onClick={() => {
                  onSelect(key);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between",
                  key === selectedModel && "bg-accent"
                )}
              >
                <div>
                  <div className="font-medium text-sm">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.provider}</div>
                </div>
                <span className="text-sm">{m.description}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ChatInterface() {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `# 👋 Welcome to ByteReaper!

I'm your AI developer assistant. I can help you with:

- 🔍 **Code Analysis** - Review your code for bugs, security issues, and improvements
- 📁 **File Analysis** - Upload code files and I'll analyze them
- 🌐 **Web Search** - Search for documentation, tutorials, or solutions
- 📊 **GitHub Analysis** - Analyze public repositories
- 💡 **Code Explanation** - Understand how code works
- 🐛 **Debugging** - Help identify and fix bugs

**Try these commands:**
- "Analyze this code: [paste code]"
- "Search for React hooks tutorial"
- "Analyze github.com/facebook/react"
- Or just upload a file and ask me to review it!

What would you like help with today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelKey>('auto');

  // Create chat session when component mounts
  useEffect(() => {
    if (user && !sessionId) {
      createChatSession(user.uid, 'New Chat', 'auto')
        .then(id => {
          setSessionId(id);

          // Check for initial prompt from home page
          if (typeof window !== 'undefined') {
            const initialPrompt = sessionStorage.getItem('initialPrompt');
            if (initialPrompt) {
              sessionStorage.removeItem('initialPrompt');
              setInput(initialPrompt);
            }
          }
        })
        .catch(err => console.error('Failed to create session:', err));
    }
  }, [user, sessionId]);

  // Load messages when session changes
  const loadSessionMessages = useCallback(async (sid: string) => {
    try {
      const sessionMessages = await getSessionMessages(sid);
      if (sessionMessages.length > 0) {
        setMessages(sessionMessages);
      } else {
        // Show welcome message if session is empty
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `# 👋 Welcome to ByteReaper!

I'm your AI developer assistant. I can help you with:

- 🔍 **Code Analysis** - Review your code for bugs, security issues, and improvements
- 📁 **File Analysis** - Upload code files and I'll analyze them
- 🌐 **Web Search** - Search for documentation, tutorials, or solutions
- 📊 **GitHub Analysis** - Analyze public repositories
- 💡 **Code Explanation** - Understand how code works
- 🐛 **Debugging** - Help identify and fix bugs

**Try these commands:**
- "Analyze this code: [paste code]"
- "Search for React hooks tutorial"
- "Analyze github.com/facebook/react"
- Or just upload a file and ask me to review it!

What would you like help with today?`,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  // Handle session selection from sidebar
  const handleSessionSelect = useCallback((sid: string) => {
    setSessionId(sid);
    loadSessionMessages(sid);
  }, [loadSessionMessages]);

  // Handle new chat creation
  const handleNewChat = useCallback(() => {
    if (user) {
      createChatSession(user.uid, 'New Chat', 'auto')
        .then(id => {
          setSessionId(id);
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `# 👋 Welcome to ByteReaper!

I'm your AI developer assistant. I can help you with:

- 🔍 **Code Analysis** - Review your code for bugs, security issues, and improvements
- 📁 **File Analysis** - Upload code files and I'll analyze them
- 🌐 **Web Search** - Search for documentation, tutorials, or solutions
- 📊 **GitHub Analysis** - Analyze public repositories
- 💡 **Code Explanation** - Understand how code works
- 🐛 **Debugging** - Help identify and fix bugs

**Try these commands:**
- "Analyze this code: [paste code]"
- "Search for React hooks tutorial"
- "Analyze github.com/facebook/react"
- Or just upload a file and ask me to review it!

What would you like help with today?`,
            timestamp: new Date(),
          }]);
          setInput("");
          setAttachments([]);
        })
        .catch(err => console.error('Failed to create session:', err));
    }
  }, [user]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    const newAttachments: FileAttachment[] = [];
    
    for (const file of Array.from(files)) {
      const fileType = getFileType(file);
      let content: string | undefined;
      let preview: string | undefined;

      if (fileType === 'code' || fileType === 'text') {
        content = await file.text();
      } else if (fileType === 'image') {
        preview = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      newAttachments.push({
        id: generateId(),
        name: file.name,
        type: file.type || `application/${file.name.split('.').pop()}`,
        size: file.size,
        content,
        preview,
      });
    }

    setAttachments(prev => [...prev, ...newAttachments]);
  }, []);

  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  // Send message
  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setAttachments([]);
    setIsLoading(true);
    setIsStreaming(true);

    // Create placeholder for assistant response
    const assistantId = generateId();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }]);

    try {
      // Use streaming API with model selection
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          attachments: userMessage.attachments,
          history: messages.filter(m => m.id !== 'welcome').slice(-10),
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullContent += parsed.text;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantId 
                      ? { ...m, content: fullContent }
                      : m
                  ));
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                // Skip parse errors for incomplete chunks
              }
            }
          }
        }
      }

      // Mark as complete and save to Firestore
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: fullContent, isStreaming: false }
          : m
      ));

      // Save both messages to Firestore
      if (user && sessionId) {
        try {
          await saveMessage(sessionId, user.uid, userMessage);
          await saveMessage(sessionId, user.uid, {
            id: assistantId,
            role: 'assistant',
            content: fullContent,
            timestamp: new Date(),
          });
        } catch (err) {
          console.error('Failed to save messages:', err);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { 
              ...m, 
              content: 'Sorry, I encountered an error. Please try again.',
              isStreaming: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          : m
      ));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-7xl mx-auto">
      {/* Chat Sidebar */}
      <ChatSidebar
        currentSessionId={sessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Messages Area */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap gap-2 border-t">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-sm"
              >
                <FileIcon type={getFileType({ name: att.name } as File)} />
                <span className="max-w-[150px] truncate">{att.name}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Attach files"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything... (Shift+Enter for new line)"
              className="flex-1 min-h-[44px] max-h-[200px] resize-none"
              disabled={isLoading}
              rows={1}
            />

            <Button
              onClick={sendMessage}
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              className="h-11"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between mt-3">
            <ModelSelector
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Drag & drop files • Type "search" to search the web
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex gap-3",
      isUser && "flex-row-reverse"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-primary text-primary-foreground" : "bg-secondary"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 max-w-[80%]",
        isUser && "flex flex-col items-end"
      )}>
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map((att) => (
              <Badge key={att.id} variant="secondary" className="flex items-center gap-1">
                <FileIcon type={getFileType({ name: att.name } as File)} />
                {att.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Message Content */}
        <Card className={cn(
          "p-4",
          isUser && "bg-primary text-primary-foreground"
        )}>
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <div className={cn(
              "prose prose-sm max-w-none",
              isUser ? "prose-invert" : "dark:prose-invert"
            )}>
              <ReactMarkdown
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const inline = !match;
                    return inline ? (
                      <code className={cn("bg-muted px-1 py-0.5 rounded text-sm", className)} {...props}>
                        {children}
                      </code>
                    ) : (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg text-sm"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    );
                  },
                  a({ href, children }) {
                    return (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </Card>

        {/* Search Results */}
        {message.searchResults && message.searchResults.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Search className="h-3 w-3" /> Web search results:
            </p>
            {message.searchResults.slice(0, 3).map((result, i) => (
              <a
                key={i}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-primary hover:underline truncate"
              >
                {result.title}
              </a>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground mt-1">
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
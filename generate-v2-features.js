/**
 * ByteReaper V2 Features Generator
 * 
 * Adds AI Chat Agent capabilities:
 * - Full conversational AI
 * - File/Code upload & analysis
 * - Web search (DuckDuckGo - free)
 * - Streaming responses
 * 
 * Run: node generate-v2-features.js
 */

const fs = require('fs');
const path = require('path');

const baseDir = __dirname;

function writeFile(filePath, content) {
  const fullPath = path.join(baseDir, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
  console.log('  ✓', filePath);
}

console.log('🚀 Adding ByteReaper V2 Features...\n');

// ============================================================================
// NEW TYPES
// ============================================================================

writeFile('src/types/chat.ts', `
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  searchResults?: SearchResult[];
  isStreaming?: boolean;
  error?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  preview?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface AgentTool {
  name: 'search' | 'analyze_repo' | 'analyze_code' | 'explain';
  description: string;
  parameters?: Record<string, any>;
}

export interface ConversationState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentTool?: AgentTool['name'];
  error?: string;
}
`.trim());

console.log('✓ Chat types created');

// ============================================================================
// WEB SEARCH (DuckDuckGo - FREE)
// ============================================================================

writeFile('src/lib/search/duckduckgo.ts', `
// DuckDuckGo Search - Free, no API key needed

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  error?: string;
}

export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResponse> {
  try {
    // Use DuckDuckGo HTML lite version
    const encodedQuery = encodeURIComponent(query);
    const url = \`https://html.duckduckgo.com/html/?q=\${encodedQuery}\`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(\`Search failed: \${response.status}\`);
    }

    const html = await response.text();
    const results = parseSearchResults(html, maxResults);

    return { results, query };
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return {
      results: [],
      query,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

function parseSearchResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  
  // Parse result links and snippets
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\\s\\S]*?)<\\/a>/gi;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\\s\\S]*?)<\\/a>/gi;
  
  const links: { url: string; title: string }[] = [];
  const snippets: string[] = [];
  
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = decodeURIComponent(match[1].replace(/.*uddg=/, '').split('&')[0]) || match[1];
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    if (url && title && url.startsWith('http')) {
      links.push({ url, title });
    }
  }
  
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
  }
  
  for (let i = 0; i < Math.min(links.length, maxResults); i++) {
    results.push({
      title: decodeHtmlEntities(links[i].title),
      url: links[i].url,
      snippet: decodeHtmlEntities(snippets[i] || ''),
    });
  }

  return results;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// DuckDuckGo Instant Answer API
export async function instantAnswer(query: string): Promise<{
  abstract: string;
  source: string;
  url: string;
} | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = \`https://api.duckduckgo.com/?q=\${encodedQuery}&format=json&no_html=1\`;
    
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    
    if (data.Abstract) {
      return {
        abstract: data.Abstract,
        source: data.AbstractSource || 'DuckDuckGo',
        url: data.AbstractURL || '',
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}
`.trim());

console.log('✓ DuckDuckGo search created');

// ============================================================================
// AI AGENT SYSTEM (OpenRouter)
// ============================================================================

writeFile('src/lib/ai/agent.ts', `
import { searchWeb } from '@/lib/search/duckduckgo';
import { ChatMessage, FileAttachment, SearchResult } from '@/types/chat';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-exp:free'; // Free model on OpenRouter

const SYSTEM_PROMPT = \`You are ByteReaper, an expert AI developer assistant. You help developers with:

1. **Code Analysis**: Review code for bugs, security issues, performance problems, and best practices
2. **Code Explanation**: Explain how code works in clear, simple terms
3. **Code Generation**: Write clean, efficient code with proper error handling
4. **Debugging Help**: Help identify and fix bugs in code
5. **Architecture Advice**: Suggest better design patterns and architectures
6. **Web Search**: Search the web for documentation, tutorials, and solutions
7. **GitHub Analysis**: Analyze public GitHub repositories

When analyzing code:
- Be specific about line numbers and exact issues
- Explain WHY something is a problem
- Provide concrete fixes with code examples
- Rate severity: critical, high, medium, low

When searching the web:
- Summarize key findings
- Include relevant links
- Focus on authoritative sources

Format your responses with markdown for better readability.
Use code blocks with language identifiers for code snippets.
Be concise but thorough.\`;

export interface AgentResponse {
  content: string;
  searchResults?: SearchResult[];
  toolUsed?: string;
}

async function callOpenRouter(messages: { role: string; content: string }[], stream = false) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'ByteReaper',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || \`API error: \${response.status}\`);
  }

  return response;
}

export async function processAgentMessage(
  userMessage: string,
  attachments: FileAttachment[] = [],
  conversationHistory: ChatMessage[] = []
): Promise<AgentResponse> {
  // Detect if user wants to search the web
  const searchIntent = detectSearchIntent(userMessage);
  let searchResults: SearchResult[] | undefined;
  let searchContext = '';

  if (searchIntent) {
    const searchResponse = await searchWeb(searchIntent, 5);
    if (searchResponse.results.length > 0) {
      searchResults = searchResponse.results;
      searchContext = \`\\n\\nWeb search results for "\${searchIntent}":\\n\${
        searchResults.map((r, i) => \`\${i + 1}. [\${r.title}](\${r.url})\\n   \${r.snippet}\`).join('\\n\\n')
      }\\n\\nUse these search results to help answer the user's question.\`;
    }
  }

  // Build conversation context
  const historyContext = conversationHistory
    .slice(-10)
    .map(m => \`\${m.role === 'user' ? 'User' : 'Assistant'}: \${m.content}\`)
    .join('\\n\\n');

  // Build attachment context
  let attachmentContext = '';
  if (attachments.length > 0) {
    attachmentContext = '\\n\\nAttached files:\\n' + attachments.map(a => {
      return \`**\${a.name}** (\${a.type}):\\n\\\`\\\`\\\`\\n\${a.content?.slice(0, 10000) || '[Binary file]'}\\n\\\`\\\`\\\`\`;
    }).join('\\n\\n');
  }

  const userContent = \`Previous conversation:\\n\${historyContext || '(New conversation)'}\\n\${attachmentContext}\\n\${searchContext}\\n\\nUser: \${userMessage}\`;

  try {
    const response = await callOpenRouter([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ]);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      content,
      searchResults,
      toolUsed: searchResults ? 'search' : undefined,
    };
  } catch (error: any) {
    console.error('Agent error:', error);
    throw new Error(\`Failed to process message: \${error.message}\`);
  }
}

function detectSearchIntent(message: string): string | null {
  const searchPatterns = [
    /search(?:\\s+(?:for|the\\s+web|online))?\\s+(?:for\\s+)?["""]?(.+?)["""]?$/i,
    /(?:look\\s+up|find\\s+(?:info|information)\\s+(?:on|about))\\s+(.+)/i,
    /what\\s+(?:is|are)\\s+(?:the\\s+)?(?:latest|newest|current)\\s+(.+)/i,
    /how\\s+(?:do\\s+I|to)\\s+(.+?)\\s+(?:in\\s+\\d{4}|latest|now)/i,
  ];

  for (const pattern of searchPatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  const searchKeywords = ['search', 'look up', 'find online', 'google', 'latest', 'news about'];
  const lowerMessage = message.toLowerCase();
  
  for (const keyword of searchKeywords) {
    if (lowerMessage.includes(keyword)) {
      const idx = lowerMessage.indexOf(keyword);
      const query = message.slice(idx + keyword.length).trim();
      if (query.length > 3) {
        return query;
      }
    }
  }

  return null;
}

// Streaming version for real-time responses (OpenRouter)
export async function* streamAgentMessage(
  userMessage: string,
  attachments: FileAttachment[] = [],
  conversationHistory: ChatMessage[] = []
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  // Build context
  const historyContext = conversationHistory
    .slice(-10)
    .map(m => \`\${m.role === 'user' ? 'User' : 'Assistant'}: \${m.content}\`)
    .join('\\n\\n');

  let attachmentContext = '';
  if (attachments.length > 0) {
    attachmentContext = '\\n\\nAttached files:\\n' + attachments.map(a => {
      return \`**\${a.name}** (\${a.type}):\\n\\\`\\\`\\\`\\n\${a.content?.slice(0, 10000) || '[Binary file]'}\\n\\\`\\\`\\\`\`;
    }).join('\\n\\n');
  }

  const userContent = \`Previous conversation:\\n\${historyContext || '(New conversation)'}\\n\${attachmentContext}\\n\\nUser: \${userMessage}\`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'ByteReaper',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(\`API error: \${response.status}\`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Skip parse errors
        }
      }
    }
  }
}
`.trim());

console.log('✓ AI Agent system created (OpenRouter)');

// ============================================================================
// API ROUTES
// ============================================================================

writeFile('src/app/api/chat/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { processAgentMessage } from '@/lib/ai/agent';
import { ChatMessage, FileAttachment } from '@/types/chat';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, attachments = [], history = [] } = body as {
      message: string;
      attachments?: FileAttachment[];
      history?: ChatMessage[];
    };

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const response = await processAgentMessage(message, attachments, history);

    return NextResponse.json({
      success: true,
      content: response.content,
      searchResults: response.searchResults,
      toolUsed: response.toolUsed,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
`.trim());

writeFile('src/app/api/chat/stream/route.ts', `
import { NextRequest } from 'next/server';
import { streamAgentMessage } from '@/lib/ai/agent';
import { ChatMessage, FileAttachment } from '@/types/chat';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, attachments = [], history = [] } = body as {
      message: string;
      attachments?: FileAttachment[];
      history?: ChatMessage[];
    };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamAgentMessage(message, attachments, history);
          
          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(\`data: \${JSON.stringify({ text: chunk })}\\n\\n\`));
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\\n\\n'));
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Stream failed';
          controller.enqueue(encoder.encode(\`data: \${JSON.stringify({ error: errorMessage })}\\n\\n\`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream API error:', error);
    return new Response(JSON.stringify({ error: 'Stream failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
`.trim());

writeFile('src/app/api/search/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { searchWeb, instantAnswer } from '@/lib/search/duckduckgo';

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 5 } = await request.json();

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const [searchResults, instant] = await Promise.all([
      searchWeb(query, maxResults),
      instantAnswer(query),
    ]);

    return NextResponse.json({
      success: true,
      results: searchResults.results,
      instant,
      query,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
`.trim());

console.log('✓ API routes created');

// ============================================================================
// ENHANCED CHAT INTERFACE
// ============================================================================

writeFile('src/components/chat/chat-interface.tsx', `
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, Search, Github, Loader2, X, Bot, User, FileCode, Image as ImageIcon, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChatMessage, FileAttachment, SearchResult } from "@/types/chat";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

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

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: \`# 👋 Welcome to ByteReaper!

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

What would you like help with today?\`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
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
        type: file.type || \`application/\${file.name.split('.').pop()}\`,
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
      // Use streaming API
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          attachments: userMessage.attachments,
          history: messages.filter(m => m.id !== 'welcome').slice(-10),
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
          const lines = chunk.split('\\n');

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

      // Mark as complete
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, isStreaming: false }
          : m
      ));
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
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto">
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

        <p className="text-xs text-muted-foreground mt-2 text-center">
          ByteReaper uses Gemini AI • Drag & drop files to upload • Type "search" to search the web
        </p>
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
                    const match = /language-(\\w+)/.exec(className || '');
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
                        {String(children).replace(/\\n$/, '')}
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
`.trim());

console.log('✓ Enhanced chat interface created');

// ============================================================================
// UPDATE ANALYZE PAGE
// ============================================================================

writeFile('src/app/analyze/page.tsx', `
import { ChatInterface } from "@/components/chat/chat-interface";

export const metadata = {
  title: "ByteReaper - AI Developer Assistant",
  description: "Chat with ByteReaper AI to analyze code, search the web, and get developer assistance.",
};

export default function AnalyzePage() {
  return <ChatInterface />;
}
`.trim());

// ============================================================================
// UPDATE LANDING PAGE
// ============================================================================

writeFile('src/components/landing/hero.tsx', `
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skull, ArrowRight, Bot, Code, Search, FileUp } from "lucide-react";

export function Hero() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
      </div>

      <div className="container px-4 mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Icon */}
          <div className="relative inline-block mb-8">
            <Skull className="h-20 w-20 md:h-24 md:w-24 text-primary mx-auto" />
            <div className="absolute inset-0 h-20 w-20 md:h-24 md:w-24 bg-primary/20 rounded-full blur-xl mx-auto" />
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
            <span className="text-gradient">ByteReaper</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Your AI Developer Assistant. Chat, analyze code, search the web,
            and review GitHub repositories — all in one place.
          </p>

          {/* Features Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full text-sm">
              <Bot className="h-4 w-4 text-primary" />
              AI Chat
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full text-sm">
              <Code className="h-4 w-4 text-primary" />
              Code Analysis
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full text-sm">
              <Search className="h-4 w-4 text-primary" />
              Web Search
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full text-sm">
              <FileUp className="h-4 w-4 text-primary" />
              File Upload
            </div>
          </div>

          {/* CTA */}
          <Link href="/analyze">
            <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 group">
              Start Chatting
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>

          {/* Trust */}
          <p className="mt-6 text-sm text-muted-foreground">
            🔒 100% Free • No signup required • Powered by Gemini AI
          </p>
        </motion.div>
      </div>
    </section>
  );
}
`.trim());

writeFile('src/components/landing/features.tsx', `
"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { 
  Bot, Code, Shield, Zap, FileText, Search,
  Github, MessageSquare, Upload
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI Chat Assistant",
    description: "Chat naturally with ByteReaper. Ask questions, get explanations, and receive help with any coding problem.",
  },
  {
    icon: Code,
    title: "Code Analysis",
    description: "Paste code or upload files for instant analysis. Get feedback on bugs, security issues, and improvements.",
  },
  {
    icon: Search,
    title: "Web Search",
    description: "Search the web for documentation, tutorials, and solutions without leaving the chat.",
  },
  {
    icon: Github,
    title: "GitHub Analysis",
    description: "Analyze public GitHub repositories. Get comprehensive reports on code quality and architecture.",
  },
  {
    icon: Upload,
    title: "File Upload",
    description: "Drag and drop files directly into the chat. Support for code files, images, and text documents.",
  },
  {
    icon: Shield,
    title: "Security Review",
    description: "Identify security vulnerabilities, unsafe patterns, and potential exploits in your code.",
  },
  {
    icon: Zap,
    title: "Performance Tips",
    description: "Get suggestions for optimizing performance, reducing complexity, and improving efficiency.",
  },
  {
    icon: FileText,
    title: "Documentation Help",
    description: "Generate documentation, explain complex code, and improve code readability.",
  },
  {
    icon: MessageSquare,
    title: "Natural Conversation",
    description: "No rigid commands. Just chat naturally and ByteReaper understands your intent.",
  },
];

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 md:py-32">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A complete AI developer toolkit in a simple chat interface
          </p>
        </div>

        <div 
          ref={ref}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="flex flex-col items-start p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors"
            >
              <feature.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
`.trim());

console.log('✓ Landing page updated');

// ============================================================================
// UPDATE NAVBAR
// ============================================================================

writeFile('src/components/shared/navbar.tsx', `
"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Skull, Moon, Sun, Github, MessageSquare } from "lucide-react";

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative">
            <Skull className="h-8 w-8 text-primary" />
          </div>
          <span className="font-bold text-xl hidden sm:inline">ByteReaper</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <Link href="/analyze">
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
          </Link>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon">
              <Github className="h-5 w-5" />
            </Button>
          </a>
        </nav>
      </div>
    </header>
  );
}
`.trim());

console.log('✓ Navbar updated');

// ============================================================================
// UPDATE PACKAGE.JSON - Add new dependencies
// ============================================================================

const packageJson = JSON.parse(fs.readFileSync(path.join(baseDir, 'package.json'), 'utf-8'));

// Add new dependencies if not present
const newDeps = {
  'react-markdown': '^9.0.1',
  'react-syntax-highlighter': '^15.6.1',
  'remark-gfm': '^4.0.0',
};

const newDevDeps = {
  '@types/react-syntax-highlighter': '^15.5.13',
};

packageJson.dependencies = { ...packageJson.dependencies, ...newDeps };
packageJson.devDependencies = { ...packageJson.devDependencies, ...newDevDeps };

fs.writeFileSync(
  path.join(baseDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

console.log('✓ package.json updated with new dependencies');

// ============================================================================
// UPDATE README
// ============================================================================

writeFile('README.md', `
# 🦴 ByteReaper - AI Developer Assistant

<div align="center">

![ByteReaper](https://img.shields.io/badge/ByteReaper-AI%20Developer%20Assistant-purple?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Gemini](https://img.shields.io/badge/Gemini-AI-green?style=for-the-badge)

**Your AI-powered developer companion. Chat, analyze code, search the web, and review repositories.**

[Live Demo](#) • [Features](#features) • [Getting Started](#getting-started) • [API](#api)

</div>

---

## ✨ Features

### 🤖 AI Chat Assistant
- Natural conversation interface
- Context-aware responses
- Code explanation and generation
- Debugging assistance

### 📁 File Upload & Analysis
- Drag & drop file support
- Support for 20+ programming languages
- Instant code review
- Security vulnerability detection

### 🔍 Web Search
- Built-in DuckDuckGo search (free, no API key)
- Search for documentation
- Find tutorials and solutions
- Research best practices

### 📊 GitHub Repository Analysis
- Analyze public repositories
- Code quality scoring
- Architecture review
- Security findings
- Performance recommendations

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API key (free)

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/yourusername/bytereaper.git
cd bytereaper

# Install dependencies
npm install

# Generate source files (if not present)
node generate-source.js
node generate-v2-features.js

# Create environment file
cp .env.example .env.local

# Add your API keys to .env.local
# GEMINI_API_KEY=your_key_here
# GITHUB_TOKEN=your_token_here (optional)

# Start development server
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| \`GEMINI_API_KEY\` | Yes | Google Gemini API key ([Get free key](https://makersuite.google.com/app/apikey)) |
| \`GITHUB_TOKEN\` | No | GitHub Personal Access Token (increases rate limits) |

---

## 💬 Usage Examples

### Chat Commands

\`\`\`
"Explain this code: [paste code]"
"Search for React hooks best practices"
"Analyze github.com/facebook/react"
"Review this file for security issues"
"Help me debug this error: [error message]"
"Write a function that [description]"
\`\`\`

### File Upload
- Drag and drop files into the chat
- Supports: .js, .ts, .py, .java, .cpp, .go, .rs, .rb, .php, and more
- Image support for diagrams and screenshots

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Google Gemini 1.5 Flash
- **Search**: DuckDuckGo (free)
- **GitHub**: Octokit

---

## 📁 Project Structure

\`\`\`
bytereaper/
├── src/
│   ├── app/                 # Next.js pages
│   │   ├── api/            # API routes
│   │   │   ├── chat/       # Chat & streaming endpoints
│   │   │   ├── search/     # Web search endpoint
│   │   │   └── analyze/    # Repo analysis endpoint
│   │   ├── analyze/        # Chat interface page
│   │   └── report/         # Analysis report page
│   ├── components/         # React components
│   │   ├── chat/          # Chat interface
│   │   ├── landing/       # Landing page
│   │   ├── report/        # Report components
│   │   └── ui/            # shadcn/ui components
│   ├── lib/               # Core logic
│   │   ├── ai/            # Gemini integration
│   │   ├── search/        # DuckDuckGo search
│   │   ├── github/        # GitHub API
│   │   └── analysis/      # Code analysis
│   └── types/             # TypeScript types
├── public/                # Static assets
└── package.json
\`\`\`

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

## 🙏 Acknowledgments

- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI model
- [DuckDuckGo](https://duckduckgo.com) - Free web search
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Next.js](https://nextjs.org) - React framework

---

<div align="center">

**Built with 💜 by ByteReaper Team**

</div>
`.trim());

console.log('✓ README updated');

// ============================================================================
// DONE
// ============================================================================

console.log('\\n========================================');
console.log('✅ ByteReaper V2 Features Generated!');
console.log('========================================');
console.log('\\nNew capabilities:');
console.log('  • AI Chat Assistant (conversational)');
console.log('  • File Upload & Analysis');
console.log('  • Web Search (DuckDuckGo - free)');
console.log('  • Streaming Responses');
console.log('\\nNext steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm run dev');
console.log('3. Open: http://localhost:3000/analyze');
console.log('');

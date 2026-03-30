"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Loader2, Bot, User, Github, ExternalLink, 
  CheckCircle, AlertCircle, Sparkles, Code, Shield, 
  Zap, FileText, Skull
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseGitHubUrl } from "@/lib/utils/helpers";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  type?: "text" | "analysis-start" | "analysis-progress" | "analysis-complete" | "error" | "repo-info";
  data?: any;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "agent",
    content: "👋 Hey there! I'm **ByteReaper**, your AI code analysis agent. I can analyze any public GitHub repository and give you detailed insights about code quality, security, performance, and more.\n\nJust paste a GitHub repository URL and I'll get to work!",
    timestamp: new Date(),
    type: "text",
  },
];

const EXAMPLE_REPOS = [
  { name: "facebook/react", desc: "React library" },
  { name: "vercel/next.js", desc: "Next.js framework" },
  { name: "tailwindlabs/tailwindcss", desc: "Tailwind CSS" },
];

export function ChatInterface() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAnalyzing) return;

    const userInput = input.trim();
    setInput("");

    // Add user message
    addMessage({ role: "user", content: userInput, type: "text" });

    // Parse GitHub URL
    const parsed = parseGitHubUrl(userInput);
    if (!parsed) {
      addMessage({
        role: "agent",
        content: "🤔 I couldn't recognize that as a GitHub repository URL. Please try a format like:\n\n- `https://github.com/owner/repo`\n- `github.com/owner/repo`\n- `owner/repo`",
        type: "error",
      });
      return;
    }

    setIsAnalyzing(true);

    // Add initial response
    const analysisId = addMessage({
      role: "agent",
      content: `🔍 Great! Let me analyze **${parsed.owner}/${parsed.repo}**...`,
      type: "analysis-start",
      data: { owner: parsed.owner, repo: parsed.repo },
    });

    // Simulate progress updates
    const progressMessages = [
      { progress: 15, message: "📡 Connecting to GitHub and fetching repository info..." },
      { progress: 30, message: "📂 Reading the file structure and identifying key files..." },
      { progress: 50, message: "🔬 Analyzing code patterns and tech stack..." },
      { progress: 70, message: "🤖 Running AI analysis on code quality, security, and performance..." },
      { progress: 85, message: "📊 Generating comprehensive report..." },
      { progress: 95, message: "✨ Finalizing analysis..." },
    ];

    let progressIndex = 0;
    const progressInterval = setInterval(() => {
      if (progressIndex < progressMessages.length) {
        setCurrentProgress(progressMessages[progressIndex].progress);
        updateMessage(analysisId, {
          content: `🔍 Analyzing **${parsed.owner}/${parsed.repo}**\n\n${progressMessages[progressIndex].message}`,
          data: { ...parsed, progress: progressMessages[progressIndex].progress },
        });
        progressIndex++;
      }
    }, 2000);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: parsed.owner, repo: parsed.repo }),
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setCurrentProgress(100);

      // Update with success
      updateMessage(analysisId, {
        content: `✅ Analysis complete for **${parsed.owner}/${parsed.repo}**!`,
        type: "analysis-complete",
        data: { ...parsed, reportId: data.id, scores: data.scores },
      });

      // Add detailed results message
      addMessage({
        role: "agent",
        content: generateResultsSummary(data),
        type: "repo-info",
        data: { reportId: data.id, scores: data.scores, findingsCount: data.findingsCount },
      });

    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      
      updateMessage(analysisId, {
        content: `❌ Oops! ${errorMessage}\n\nThis could happen if:\n- The repository doesn't exist or is private\n- GitHub API rate limit exceeded\n- The repository is too large\n\nTry another repository or check the URL.`,
        type: "error",
      });
    } finally {
      setIsAnalyzing(false);
      setCurrentProgress(0);
    }
  };

  const generateResultsSummary = (data: any) => {
    const { scores, findingsCount } = data;
    const scoreEmoji = scores.overall >= 80 ? "🟢" : scores.overall >= 60 ? "🟡" : scores.overall >= 40 ? "🟠" : "🔴";
    
    return `## 📊 Analysis Results

${scoreEmoji} **Overall Health Score: ${scores.overall}/100**

### Score Breakdown:
- 🔧 Code Quality: **${scores.codeQuality}**/100
- 🛡️ Security: **${scores.security}**/100
- ⚡ Performance: **${scores.performance}**/100
- 📦 Architecture: **${scores.architecture}**/100
- 📝 Documentation: **${scores.documentation}**/100
- 🧪 Testing: **${scores.testing}**/100

📋 **${findingsCount} findings** detected and prioritized.

👉 Click "View Full Report" below to see detailed analysis, specific issues, and actionable recommendations!`;
  };

  const handleExampleClick = (repo: string) => {
    setInput(`https://github.com/${repo}`);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto">
      {/* Chat Messages */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChatMessage 
                  message={message} 
                  isAnalyzing={isAnalyzing && message.type === "analysis-start"}
                  progress={currentProgress}
                  onViewReport={(id) => router.push(`/report/${id}`)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Example repos */}
      {messages.length === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <p className="text-sm text-muted-foreground mb-2">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_REPOS.map((repo) => (
              <Button
                key={repo.name}
                variant="outline"
                size="sm"
                onClick={() => handleExampleClick(repo.name)}
                className="gap-2"
              >
                <Github className="h-4 w-4" />
                {repo.name}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Input Area */}
      <div className="border-t pt-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Paste a GitHub repository URL..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isAnalyzing}
              className="pl-10 pr-4 h-12 text-base"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isAnalyzing || !input.trim()}
            size="lg"
            className="h-12 px-6"
          >
            {isAnalyzing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          ByteReaper analyzes public repositories using AI. Analysis typically takes 30-60 seconds.
        </p>
      </div>
    </div>
  );
}

interface ChatMessageProps {
  message: Message;
  isAnalyzing?: boolean;
  progress?: number;
  onViewReport?: (id: string) => void;
}

function ChatMessage({ message, isAnalyzing, progress = 0, onViewReport }: ChatMessageProps) {
  const isAgent = message.role === "agent";

  return (
    <div className={`flex gap-3 ${isAgent ? "" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isAgent ? "bg-primary/10" : "bg-secondary"
      }`}>
        {isAgent ? (
          <Skull className="h-4 w-4 text-primary" />
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <Card className={`max-w-[80%] px-4 py-3 ${
        isAgent ? "bg-card" : "bg-primary text-primary-foreground"
      } ${message.type === "error" ? "border-destructive" : ""}`}>
        <div className="space-y-3">
          {/* Progress bar for analysis */}
          {isAnalyzing && progress > 0 && (
            <div className="space-y-2">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{progress}% complete</p>
            </div>
          )}

          {/* Message text with markdown-like rendering */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MessageContent content={message.content} />
          </div>

          {/* Action buttons for completed analysis */}
          {message.type === "repo-info" && message.data?.reportId && (
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                onClick={() => onViewReport?.(message.data.reportId)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                View Full Report
              </Button>
            </div>
          )}

          {/* Score badges for analysis complete */}
          {message.type === "analysis-complete" && message.data?.scores && (
            <div className="flex gap-2 flex-wrap pt-2">
              <Badge variant={message.data.scores.overall >= 80 ? "success" : message.data.scores.overall >= 60 ? "medium" : "critical"}>
                Score: {message.data.scores.overall}/100
              </Badge>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  const lines = content.split("\n");
  
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        // Headers
        if (line.startsWith("## ")) {
          return <h3 key={i} className="text-lg font-semibold mt-4">{line.slice(3)}</h3>;
        }
        if (line.startsWith("### ")) {
          return <h4 key={i} className="text-base font-medium mt-3">{line.slice(4)}</h4>;
        }
        // List items
        if (line.startsWith("- ")) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.slice(2)) }} />
            </div>
          );
        }
        // Empty line
        if (!line.trim()) {
          return <div key={i} className="h-2" />;
        }
        // Regular paragraph
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
        );
      })}
    </div>
  );
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-secondary px-1 py-0.5 rounded text-sm">$1</code>');
}

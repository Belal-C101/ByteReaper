"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skull, Send, Sparkles, Code, Search, FileUp, Github, Bot, Brain } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const EXAMPLE_PROMPTS = [
  {
    icon: Code,
    title: "Analyze this React component",
    prompt: "Can you review this React component and suggest improvements for performance and best practices?",
  },
  {
    icon: Search,
    title: "Search for Next.js 15 features",
    prompt: "Search for the latest features in Next.js 15 and explain the app router improvements",
  },
  {
    icon: Github,
    title: "Analyze a GitHub repository",
    prompt: "Analyze the github.com/vercel/next.js repository and give me a security assessment",
  },
  {
    icon: Brain,
    title: "Debug my TypeScript code",
    prompt: "I'm getting a type error in my TypeScript code. Can you help me debug it?",
  },
];

export function NewHero() {
  const router = useRouter();
  const { user } = useAuth();
  const [input, setInput] = useState("");

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  const handleSubmit = () => {
    if (!input.trim()) return;

    // Store the prompt in session storage to use in the chat page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('initialPrompt', input);
    }

    router.push('/analyze');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
      </div>

      <div className="container px-4 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Chat Interface */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Skull className="h-12 w-12 text-primary" />
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                </div>
                <h1 className="text-5xl md:text-6xl font-bold">
                  <span className="text-gradient">ByteReaper</span>
                </h1>
              </div>
              <p className="text-xl text-muted-foreground">
                Your AI developer assistant for code analysis, debugging, and more
              </p>
            </div>

            {/* Chat Input */}
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What would you like help with today? (e.g., 'Analyze this React code...')"
                  className="min-h-[120px] pr-12 resize-none text-base"
                  rows={4}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  size="icon"
                  className="absolute bottom-3 right-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Example Prompts */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Try these examples:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXAMPLE_PROMPTS.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => handlePromptClick(example.prompt)}
                      className="flex items-start gap-3 p-3 text-left border rounded-lg hover:bg-accent transition-colors group"
                    >
                      <example.icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">
                          {example.title}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Features Pills */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-xs">
                <Bot className="h-3 w-3 text-primary" />
                7 Free AI Models
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-xs">
                <Code className="h-3 w-3 text-primary" />
                Code Analysis
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-xs">
                <Search className="h-3 w-3 text-primary" />
                Web Search
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-xs">
                <FileUp className="h-3 w-3 text-primary" />
                File Upload
              </div>
            </div>

            {/* Trust Badge */}
            <p className="text-sm text-muted-foreground">
              🔒 100% Free • {user ? 'Signed in' : 'No signup required'} • Powered by OpenRouter AI
            </p>
          </motion.div>

          {/* Right Side - Hero Image/Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Placeholder for AI-generated image */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 rounded-3xl" />

              {/* Floating Code Blocks Animation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute top-1/4 left-1/4 p-4 bg-background/80 backdrop-blur-sm border rounded-lg shadow-lg"
                >
                  <Code className="h-8 w-8 text-primary" />
                </motion.div>

                <motion.div
                  animate={{
                    y: [0, 10, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                  className="absolute top-1/2 right-1/4 p-4 bg-background/80 backdrop-blur-sm border rounded-lg shadow-lg"
                >
                  <Brain className="h-8 w-8 text-purple-500" />
                </motion.div>

                <motion.div
                  animate={{
                    y: [0, -15, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1,
                  }}
                  className="absolute bottom-1/4 left-1/3 p-4 bg-background/80 backdrop-blur-sm border rounded-lg shadow-lg"
                >
                  <Sparkles className="h-8 w-8 text-pink-500" />
                </motion.div>

                {/* Central Icon */}
                <div className="relative">
                  <div className="p-8 bg-background border-2 border-primary rounded-2xl shadow-2xl">
                    <Skull className="h-20 w-20 text-primary" />
                  </div>
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-2xl" />
                </div>
              </div>
            </div>

            {/* Image Generation Prompt Info */}
            <div className="mt-6 p-4 bg-secondary/50 rounded-lg border">
              <p className="text-xs text-muted-foreground font-mono">
                <strong>AI Image Prompt (for Nano Banana 2):</strong><br />
                &quot;A futuristic cyberpunk AI assistant represented by a glowing skull icon surrounded by
                floating holographic code snippets, data streams, and neural network visualizations.
                Dark theme with neon purple, pink, and cyan accents. High-tech, professional,
                modern aesthetic. 3D rendered, dramatic lighting, tech noir style.&quot;
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Search, FileText, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SUGGESTED_PROMPTS = [
  "Review this React component for performance",
  "Find security issues in my Node API",
  "Explain this TypeScript error",
  "Compare Prisma vs Drizzle for Next.js",
];

const STARTER_SEARCHES = [
  "How to optimize Next.js App Router caching",
  "Best React architecture for scalable apps",
  "Secure file upload patterns without cloud storage",
  "Common Firestore rules mistakes and fixes",
];

export function Hero() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  const handleStartChat = (e: FormEvent) => {
    e.preventDefault();

    if (prompt.trim()) {
      sessionStorage.setItem("bytereaper_landing_prompt", prompt.trim());
    }

    router.push("/analyze");
  };

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-16 left-24 w-80 h-80 bg-zinc-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="container px-4 mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card/60 text-sm">
              <Image
                src="/brand/bytereaper-mark.svg"
                alt="ByteReaper logo"
                width={16}
                height={16}
                className="h-4 w-4"
              />
              <span className="font-medium">ByteReaper • AI Dev Co-pilot</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Think fast,
                <br />
                build <span className="text-gradient">smarter</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                Claude-inspired flow, ByteReaper vibe. Ask coding questions, drop files, and keep every conversation in your personal Firestore chat history.
              </p>
            </div>

            <form onSubmit={handleStartChat} className="space-y-4">
              <div className="rounded-2xl border bg-card/60 backdrop-blur p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask ByteReaper anything about your code..."
                    className="w-full min-h-[110px] resize-none bg-transparent outline-none text-sm md:text-base"
                  />
                  <Button type="submit" className="shrink-0">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Start
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPrompt(item)}
                    className="px-3 py-1.5 rounded-full border text-xs md:text-sm hover:bg-accent transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="rounded-3xl border bg-card/50 backdrop-blur overflow-hidden min-h-[520px] shadow-2xl">
              <div className="h-full p-6 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:38px_38px]">
                <div className="space-y-4">
                  <div className="rounded-xl border bg-background/60 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Suggested searches</p>
                    </div>
                    <ul className="space-y-2">
                      {STARTER_SEARCHES.map((query) => (
                        <li key={query} className="text-sm text-muted-foreground flex items-start gap-2">
                          <Search className="h-3.5 w-3.5 mt-1 text-primary" />
                          <span>{query}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-background/60 p-4">
                      <Code2 className="h-5 w-5 text-primary mb-2" />
                      <p className="text-sm font-medium">Code Analysis</p>
                      <p className="text-xs text-muted-foreground mt-1">Bugs, architecture, performance</p>
                    </div>
                    <div className="rounded-xl border bg-background/60 p-4">
                      <FileText className="h-5 w-5 text-primary mb-2" />
                      <p className="text-sm font-medium">File-Aware Chat</p>
                      <p className="text-xs text-muted-foreground mt-1">Upload files and keep context</p>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-primary/10 p-4">
                    <p className="text-sm font-medium">Side image slot</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Replace this panel with your generated artwork from Nano Banana 2 for a premium hero look.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
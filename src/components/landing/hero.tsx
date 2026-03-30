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
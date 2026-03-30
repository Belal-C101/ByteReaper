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
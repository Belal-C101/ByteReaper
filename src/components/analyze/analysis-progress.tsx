"use client";

import { motion } from "framer-motion";
import { Loader2, Check, GitBranch, Code, Brain, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalysisProgressProps {
  stage: string;
  progress: number;
  message: string;
}

const stages = [
  { id: "fetching", label: "Fetching Repository", icon: GitBranch },
  { id: "parsing", label: "Parsing Files", icon: Code },
  { id: "analyzing", label: "AI Analysis", icon: Brain },
  { id: "generating", label: "Generating Report", icon: FileText },
];

export function AnalysisProgress({ stage, progress, message }: AnalysisProgressProps) {
  const currentIndex = stages.findIndex((s) => s.id === stage);

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="inline-block"
        >
          <Loader2 className="h-12 w-12 text-primary" />
        </motion.div>
        <p className="mt-4 text-lg font-medium">{message}</p>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="grid grid-cols-4 gap-2">
        {stages.map((s, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-colors ${
                isComplete
                  ? "text-green-500"
                  : isCurrent
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isComplete
                    ? "bg-green-500/20"
                    : isCurrent
                    ? "bg-primary/20"
                    : "bg-muted"
                }`}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span className="text-xs text-center">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

export default function InterviewQuestionsToolPage() {
  return (
    <AiToolWorkbench
      tool="interview-questions"
      title="Interview Question Generator"
      description="Generate role-specific interview questions with model answers."
      inputLabel="Additional instructions"
      inputPlaceholder="Optional: add company context, interview style, or constraints."
      fields={[
        { key: "role", label: "Role", type: "select", options: ["Frontend", "Backend", "Fullstack", "DevOps", "Data"], defaultValue: "Fullstack" },
        { key: "level", label: "Level", type: "select", options: ["Junior", "Mid", "Senior"], defaultValue: "Mid" },
        { key: "topics", label: "Topics", type: "input", placeholder: "Algorithms, system design, behavioral" },
      ]}
      composePrompt={(input, fields) => `Role: ${fields.role}\nLevel: ${fields.level}\nTopics: ${fields.topics}\n\nAdditional instructions:\n${input || "Generate 10 balanced questions with model answers."}`}
      markdownPreview
    />
  );
}

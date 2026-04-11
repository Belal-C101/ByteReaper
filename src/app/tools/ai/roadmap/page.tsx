"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

export default function RoadmapToolPage() {
  return (
    <AiToolWorkbench
      tool="roadmap"
      title="Learning Roadmap Generator"
      description="Generate phased learning roadmaps with free resources and realistic milestones."
      inputLabel="Learning goal"
      inputPlaceholder="Example: I want to learn backend engineering with Node.js and system design."
      fields={[
        { key: "level", label: "Current level", type: "select", options: ["Beginner", "Intermediate", "Advanced"], defaultValue: "Beginner" },
      ]}
      composePrompt={(input, fields) => `Current level: ${fields.level}\n\nLearning goal:\n${input}`}
      markdownPreview
    />
  );
}

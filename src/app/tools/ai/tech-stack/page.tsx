"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

export default function TechStackToolPage() {
  return (
    <AiToolWorkbench
      tool="tech-stack"
      title="Tech Stack Recommender"
      description="Get free-first stack recommendations with trade-offs and alternatives."
      inputLabel="Project requirements"
      inputPlaceholder="Describe app type, scale, reliability goals, and team constraints."
      fields={[
        { key: "teamSize", label: "Team size", type: "input", placeholder: "1-3 engineers" },
        { key: "scale", label: "Scale", type: "select", options: ["Prototype", "Startup", "Enterprise"], defaultValue: "Startup" },
      ]}
      composePrompt={(input, fields) => `Team size: ${fields.teamSize}\nScale: ${fields.scale}\n\nRequirements:\n${input}`}
      markdownPreview
    />
  );
}

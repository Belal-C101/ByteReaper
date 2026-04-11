"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

export default function ComplexityToolPage() {
  return (
    <AiToolWorkbench
      tool="complexity"
      title="Code Complexity Analyzer"
      description="Assess complexity hotspots and generate prioritized refactoring recommendations."
      inputLabel="Code to analyze"
      inputPlaceholder="Paste a function, class, or module."
      fields={[
        { key: "language", label: "Language", type: "input", placeholder: "TypeScript" },
      ]}
      composePrompt={(input, fields) => `Language: ${fields.language}\n\nCode:\n${input}`}
      markdownPreview
    />
  );
}

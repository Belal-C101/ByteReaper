"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

export default function ErrorExplainerToolPage() {
  return (
    <AiToolWorkbench
      tool="error-explainer"
      title="Error Explainer"
      description="Break down stack traces into root causes and concrete next-step fixes."
      inputLabel="Error message or stack trace"
      inputPlaceholder="Paste the full error output here."
      fields={[
        { key: "language", label: "Language", type: "input", placeholder: "TypeScript" },
        { key: "framework", label: "Framework", type: "input", placeholder: "Next.js" },
      ]}
      composePrompt={(input, fields) => `Language: ${fields.language}\nFramework: ${fields.framework}\n\nError:\n${input}`}
    />
  );
}

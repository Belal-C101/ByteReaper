"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

export default function ChangelogToolPage() {
  return (
    <AiToolWorkbench
      tool="changelog"
      title="Changelog Generator"
      description="Convert raw git logs or release notes into structured changelog formats."
      inputLabel="Git logs or change list"
      inputPlaceholder="Paste commit list, PR summaries, or release notes."
      fields={[
        { key: "format", label: "Format", type: "select", options: ["Keep a Changelog", "Conventional", "Simple"], defaultValue: "Keep a Changelog" },
      ]}
      composePrompt={(input, fields) => `Format: ${fields.format}\n\nChanges:\n${input}`}
      markdownPreview
    />
  );
}

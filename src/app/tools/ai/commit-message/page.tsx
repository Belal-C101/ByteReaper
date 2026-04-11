"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

export default function CommitMessageToolPage() {
  return (
    <AiToolWorkbench
      tool="commit-message"
      title="Commit Message Generator"
      description="Generate polished commit messages from code changes in your preferred style."
      inputLabel="Describe your code changes"
      inputPlaceholder="Summarize files changed, intent, and impact..."
      fields={[
        { key: "style", label: "Style", type: "select", options: ["Conventional Commits", "Gitmoji", "Simple"], defaultValue: "Conventional Commits" },
      ]}
      composePrompt={(input, fields) => `Style: ${fields.style}\n\nChanges:\n${input}`}
    />
  );
}

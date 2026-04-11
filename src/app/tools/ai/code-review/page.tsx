"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

export default function CodeReviewToolPage() {
  return (
    <AiToolWorkbench
      tool="code-review"
      title="Code Reviewer"
      description="Run an AI code review focused on bugs, security, performance, and maintainability."
      inputLabel="Code to review"
      inputPlaceholder="Paste code and include context about expected behavior."
      markdownPreview
    />
  );
}

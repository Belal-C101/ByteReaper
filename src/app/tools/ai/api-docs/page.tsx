"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

export default function ApiDocsToolPage() {
  return (
    <AiToolWorkbench
      tool="api-docs"
      title="API Doc Generator"
      description="Generate OpenAPI-style documentation from endpoint code and route handlers."
      inputLabel="Endpoint code"
      inputPlaceholder="Paste route handler or controller code here."
      fields={[
        { key: "format", label: "Output format", type: "select", options: ["Markdown", "JSON"], defaultValue: "Markdown" },
      ]}
      composePrompt={(input, fields) => `Output format: ${fields.format}\n\nEndpoint code:\n${input}`}
      markdownPreview
    />
  );
}

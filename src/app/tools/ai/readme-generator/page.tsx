"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

export default function ReadmeGeneratorToolPage() {
  return (
    <AiToolWorkbench
      tool="readme-generator"
      title="README Generator"
      description="Create a professional README with setup, usage, badges, and contribution guidance."
      inputLabel="Project details"
      inputPlaceholder="Describe the project, architecture, and primary use cases."
      fields={[
        { key: "projectName", label: "Project name", type: "input", placeholder: "ByteReaper" },
        { key: "repoUrl", label: "Repository URL", type: "input", placeholder: "https://github.com/..." },
        { key: "techStack", label: "Tech stack", type: "input", placeholder: "Next.js, TypeScript, Firebase" },
      ]}
      composePrompt={(input, fields) => `Project name: ${fields.projectName}\nRepo URL: ${fields.repoUrl}\nTech stack: ${fields.techStack}\n\nProject details:\n${input}`}
      markdownPreview
    />
  );
}

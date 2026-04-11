"use client";

import { AiToolWorkbench } from "@/components/tools/ai-tool-workbench";

const LANGS = ["JavaScript", "TypeScript", "Python", "Java", "C++", "Go", "Rust", "Ruby", "PHP", "C#", "Swift", "Kotlin"];

export default function CodeTranslatorToolPage() {
  return (
    <AiToolWorkbench
      tool="code-translator"
      title="Code Translator"
      description="Translate code between popular languages while preserving behavior and developer intent."
      inputLabel="Source code"
      inputPlaceholder="Paste the code you want to translate."
      fields={[
        { key: "source", label: "Source language", type: "select", options: LANGS, defaultValue: "TypeScript" },
        { key: "target", label: "Target language", type: "select", options: LANGS, defaultValue: "Python" },
      ]}
      composePrompt={(input, fields) => `Source language: ${fields.source}\nTarget language: ${fields.target}\n\nCode:\n${input}`}
    />
  );
}

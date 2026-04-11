"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { CopyButton } from "@/components/tools/copy-button";

function encodeHtml(input: string, numeric: boolean): string {
  if (!numeric) {
    const div = document.createElement("div");
    div.innerText = input;
    return div.innerHTML;
  }

  return input
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code > 127 || /[<>&"']/u.test(char)) {
        return `&#${code};`;
      }
      return char;
    })
    .join("");
}

function decodeHtml(input: string): string {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = input;
  return textArea.value;
}

export default function HtmlEntitiesPage() {
  const [input, setInput] = useState("<div>ByteReaper & Co</div>");
  const [output, setOutput] = useState("");
  const [numeric, setNumeric] = useState(false);

  return (
    <ToolPageShell
      title="HTML Entity Encoder/Decoder"
      description="Encode or decode HTML entities using named or numeric output modes."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setOutput(encodeHtml(input, numeric))} size="sm">Encode</Button>
          <Button onClick={() => setOutput(decodeHtml(input))} size="sm" variant="outline">Decode</Button>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={numeric} onChange={(event) => setNumeric(event.target.checked)} />
            Numeric entities
          </label>
          <CopyButton value={output} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Input</h2>
            <Textarea value={input} onChange={(event) => setInput(event.target.value)} className="min-h-[220px] font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Output</h2>
            <Textarea value={output} onChange={(event) => setOutput(event.target.value)} className="min-h-[220px] font-mono text-sm" />
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

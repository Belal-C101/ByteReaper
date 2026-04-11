"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { CopyButton } from "@/components/tools/copy-button";

const WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua".split(" ");
const DEV_WORDS = "function async promise runtime compiler bundle deploy commit pipeline microservice observability hooks context state machine architecture latency".split(" ");

type Mode = "paragraphs" | "sentences" | "words";

function randomWord(source: string[]): string {
  return source[Math.floor(Math.random() * source.length)] ?? "lorem";
}

export default function LoremIpsumPage() {
  const [mode, setMode] = useState<Mode>("paragraphs");
  const [count, setCount] = useState("3");
  const [developerIpsum, setDeveloperIpsum] = useState(false);
  const [output, setOutput] = useState("");

  const generate = () => {
    const source = developerIpsum ? DEV_WORDS : WORDS;
    const amount = Math.max(1, Math.min(200, Number(count) || 1));

    if (mode === "words") {
      setOutput(Array.from({ length: amount }, () => randomWord(source)).join(" "));
      return;
    }

    const sentenceFor = (length: number) => {
      const words = Array.from({ length }, () => randomWord(source));
      const joined = words.join(" ");
      return joined.charAt(0).toUpperCase() + joined.slice(1) + ".";
    };

    if (mode === "sentences") {
      setOutput(Array.from({ length: amount }, () => sentenceFor(10 + Math.floor(Math.random() * 8))).join(" "));
      return;
    }

    const paragraphs = Array.from({ length: amount }, () =>
      Array.from({ length: 4 }, () => sentenceFor(10 + Math.floor(Math.random() * 8))).join(" "),
    );
    setOutput(paragraphs.join("\n\n"));
  };

  return (
    <ToolPageShell
      title="Lorem Ipsum Generator"
      description="Generate placeholder text by paragraphs, sentences, or words, including a developer-themed ipsum mode."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select value={mode} onChange={(event) => setMode(event.target.value as Mode)} className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="paragraphs">Paragraphs</option>
            <option value="sentences">Sentences</option>
            <option value="words">Words</option>
          </select>
          <Input value={count} onChange={(event) => setCount(event.target.value)} className="w-24" />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={developerIpsum} onChange={(event) => setDeveloperIpsum(event.target.checked)} />
            Developer ipsum
          </label>
          <Button onClick={generate}>Generate</Button>
          <CopyButton value={output} />
        </div>

        <Textarea
          value={output}
          onChange={(event) => setOutput(event.target.value)}
          className="min-h-[280px] text-sm"
          placeholder="Generated lorem ipsum appears here"
        />
      </div>
    </ToolPageShell>
  );
}

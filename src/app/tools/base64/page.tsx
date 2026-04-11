"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { CopyButton } from "@/components/tools/copy-button";

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeBase64(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isLikelyBase64(value: string): boolean {
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length % 4 === 0 && /^[A-Za-z0-9+/=\s]+$/.test(cleaned);
}

export default function Base64ToolPage() {
  const [input, setInput] = useState("ByteReaper");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const autodetect = useMemo(() => isLikelyBase64(input), [input]);

  const runEncode = () => {
    try {
      setOutput(encodeBase64(input));
      setError("");
    } catch (encodeError) {
      setError(encodeError instanceof Error ? encodeError.message : "Encoding failed");
    }
  };

  const runDecode = () => {
    try {
      setOutput(decodeBase64(input));
      setError("");
    } catch (decodeError) {
      setError(decodeError instanceof Error ? decodeError.message : "Decoding failed");
    }
  };

  const handleFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    setInput(btoa(binary));
    setOutput("");
    setError("");
  };

  return (
    <ToolPageShell
      title="Base64 Encoder/Decoder"
      description="Encode text or files to Base64, decode Base64 content, and auto-detect likely encoded input."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={runEncode} size="sm">Encode</Button>
          <Button onClick={runDecode} size="sm" variant="outline">Decode</Button>
          <Button
            onClick={() => {
              if (autodetect) {
                runDecode();
                return;
              }
              runEncode();
            }}
            size="sm"
            variant="secondary"
          >
            Auto ({autodetect ? "Decode" : "Encode"})
          </Button>
          <CopyButton value={output} />
          <Button size="sm" variant="ghost" onClick={() => { setInput(""); setOutput(""); setError(""); }}>
            Clear
          </Button>
        </div>

        <label className="inline-flex items-center gap-2 text-sm cursor-pointer rounded-md border px-3 py-2 w-fit hover:bg-accent">
          <Upload className="h-4 w-4" />
          Upload file to Base64
          <input
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">Auto-detect: {autodetect ? "Input looks like Base64" : "Input looks like plain text"}</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Input</h2>
            <Textarea value={input} onChange={(event) => setInput(event.target.value)} className="min-h-[260px] font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Output</h2>
            <Textarea value={output} onChange={(event) => setOutput(event.target.value)} className="min-h-[260px] font-mono text-sm" />
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

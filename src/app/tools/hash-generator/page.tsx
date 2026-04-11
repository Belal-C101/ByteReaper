"use client";

import { useState } from "react";
import { md5 } from "js-md5";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface HashValues {
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
}

async function digest(algorithm: "SHA-1" | "SHA-256" | "SHA-512", content: ArrayBuffer): Promise<string> {
  const result = await crypto.subtle.digest(algorithm, content);
  return Array.from(new Uint8Array(result))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default function HashGeneratorPage() {
  const [input, setInput] = useState("ByteReaper");
  const [hashes, setHashes] = useState<HashValues>({ md5: "", sha1: "", sha256: "", sha512: "" });
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");

  const computeFromBytes = async (bytes: Uint8Array) => {
    const buffer = new Uint8Array(bytes).buffer;
    const [sha1, sha256, sha512] = await Promise.all([
      digest("SHA-1", buffer),
      digest("SHA-256", buffer),
      digest("SHA-512", buffer),
    ]);

    setHashes({
      md5: md5(bytes),
      sha1,
      sha256,
      sha512,
    });
  };

  const computeText = async () => {
    await computeFromBytes(new TextEncoder().encode(input));
  };

  const handleFile = async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await computeFromBytes(bytes);
  };

  const compareMatch = compareA.trim() && compareB.trim() && compareA.trim().toLowerCase() === compareB.trim().toLowerCase();

  return (
    <ToolPageShell
      title="Hash Generator"
      description="Generate MD5, SHA-1, SHA-256, and SHA-512 for text or files, and compare hash values instantly."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void computeText()}>Hash text</Button>
          <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-accent text-sm">
            <Upload className="h-4 w-4" />
            Hash file
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
        </div>

        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="font-mono text-sm min-h-[120px]"
          placeholder="Enter text to hash"
        />

        <div className="grid md:grid-cols-2 gap-3">
          {Object.entries(hashes).map(([key, value]) => (
            <div key={key} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-medium uppercase text-sm">{key}</h2>
                <CopyButton value={value} label="Copy" />
              </div>
              <p className="text-xs font-mono break-all">{value || "-"}</p>
            </div>
          ))}
        </div>

        <section className="rounded-xl border p-3 space-y-2">
          <h3 className="font-medium">Hash Compare</h3>
          <Input value={compareA} onChange={(event) => setCompareA(event.target.value)} placeholder="Hash A" className="font-mono" />
          <Input value={compareB} onChange={(event) => setCompareB(event.target.value)} placeholder="Hash B" className="font-mono" />
          {(compareA || compareB) && (
            <p className={`text-sm ${compareMatch ? "text-emerald-500" : "text-destructive"}`}>
              {compareMatch ? "Hashes match" : "Hashes do not match"}
            </p>
          )}
        </section>
      </div>
    </ToolPageShell>
  );
}

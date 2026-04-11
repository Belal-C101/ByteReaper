"use client";

import { useState } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { CopyButton } from "@/components/tools/copy-button";

export default function ImageBase64Page() {
  const [base64, setBase64] = useState("");
  const [mime, setMime] = useState("image/png");
  const [fileSize, setFileSize] = useState(0);

  const handleFile = async (file: File) => {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Unable to read file"));
      reader.readAsDataURL(file);
    });

    setMime(file.type || "image/png");
    setFileSize(file.size);
    setBase64(url);
  };

  const base64Size = base64.length;

  return (
    <ToolPageShell
      title="Image to Base64"
      description="Convert images to Base64, preview them, and copy ready-to-use HTML/CSS snippets."
    >
      <div className="space-y-4">
        <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-accent text-sm">
          <Upload className="h-4 w-4" />
          Select image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
        </label>

        <div className="grid lg:grid-cols-2 gap-4">
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Base64</h2>
            <Textarea value={base64} onChange={(event) => setBase64(event.target.value)} className="min-h-[260px] font-mono text-xs" />
            <div className="flex flex-wrap gap-2">
              <CopyButton value={base64} label="Copy Base64" />
              <CopyButton value={`<img src="${base64}" alt="preview" />`} label="Copy img tag" />
              <CopyButton value={`background-image: url('${base64}');`} label="Copy CSS" />
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium">Preview</h2>
            <div className="rounded-xl border min-h-[260px] flex items-center justify-center p-4">
              {base64 ? (
                <Image
                  src={base64}
                  alt="Uploaded preview"
                  width={320}
                  height={240}
                  className="max-h-[240px] w-auto"
                  unoptimized
                />
              ) : (
                <p className="text-sm text-muted-foreground">Upload an image to preview.</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Original size: {(fileSize / 1024).toFixed(2)} KB</p>
            <p className="text-sm text-muted-foreground">Base64 size: {(base64Size / 1024).toFixed(2)} KB</p>
            <p className="text-sm text-muted-foreground">MIME type: {mime}</p>
          </section>
        </div>
      </div>
    </ToolPageShell>
  );
}

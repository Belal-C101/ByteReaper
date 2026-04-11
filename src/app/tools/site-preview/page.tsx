"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface MicrolinkData {
  status: string;
  data?: {
    title?: string;
    description?: string;
    image?: { url?: string };
    logo?: { url?: string };
    screenshot?: { url?: string };
    url?: string;
  };
}

export default function SitePreviewPage() {
  const [url, setUrl] = useState("https://github.com/Belal-C101/ByteReaper");
  const [result, setResult] = useState<MicrolinkData["data"] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchPreview = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true`);
      const data = (await response.json()) as MicrolinkData;
      if (!response.ok || data.status !== "success") {
        throw new Error("Preview lookup failed");
      }
      setResult(data.data || null);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Preview failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="Website Screenshot / Preview"
      description="Generate screenshots and inspect metadata with Microlink's free website preview API."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" className="max-w-xl" />
          <Button onClick={() => void fetchPreview()} disabled={loading}>{loading ? "Loading..." : "Preview"}</Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && (
          <div className="grid lg:grid-cols-2 gap-4">
            <section className="rounded-xl border p-3 space-y-2">
              <h2 className="font-medium">Metadata</h2>
              <p><span className="font-medium">Title:</span> {result.title || "N/A"}</p>
              <p><span className="font-medium">Description:</span> {result.description || "N/A"}</p>
              <p><span className="font-medium">URL:</span> {result.url || "N/A"}</p>
              {result.image?.url && <p><span className="font-medium">OG image:</span> <a href={result.image.url} className="underline" target="_blank" rel="noreferrer">Open</a></p>}
            </section>

            <section className="rounded-xl border p-3 min-h-[280px] flex items-center justify-center">
              {result.screenshot?.url ? (
                <Image src={result.screenshot.url} alt="Website screenshot" width={640} height={360} className="rounded-md border" unoptimized />
              ) : (
                <p className="text-sm text-muted-foreground">Screenshot unavailable for this URL.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}

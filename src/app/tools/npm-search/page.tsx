"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface NpmSearchResult {
  package: {
    name: string;
    version: string;
    description: string;
    links?: { npm?: string; repository?: string };
    date: string;
    license?: string;
  };
  score: {
    detail: {
      popularity: number;
    };
  };
  searchScore: number;
}

interface BundleData {
  gzip?: number;
}

export default function NpmSearchPage() {
  const [query, setQuery] = useState("nextjs");
  const [results, setResults] = useState<Array<NpmSearchResult & { bundleGzipKb?: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=12`);
      const data = (await response.json()) as { objects: NpmSearchResult[] };

      const enriched = await Promise.all(
        (data.objects || []).map(async (item) => {
          try {
            const bundleResponse = await fetch(`https://bundlephobia.com/api/size?package=${encodeURIComponent(`${item.package.name}@${item.package.version}`)}`);
            const bundle = (await bundleResponse.json()) as BundleData;
            return { ...item, bundleGzipKb: bundle.gzip ? Number((bundle.gzip / 1024).toFixed(2)) : undefined };
          } catch {
            return item;
          }
        }),
      );

      setResults(enriched);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "NPM search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="NPM Package Search"
      description="Search npm registry packages and inspect metadata, links, and approximate bundle size via Bundlephobia."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="react hooks" className="max-w-sm" />
          <Button onClick={() => void search()} disabled={loading}>{loading ? "Searching..." : "Search"}</Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          {results.map((item) => (
            <article key={item.package.name} className="rounded-xl border p-3 space-y-1">
              <h2 className="font-medium">{item.package.name} <span className="text-xs text-muted-foreground">v{item.package.version}</span></h2>
              <p className="text-sm text-muted-foreground">{item.package.description}</p>
              <p className="text-xs text-muted-foreground">License: {item.package.license || "Unknown"} | Popularity score: {item.score.detail.popularity.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">Last publish: {new Date(item.package.date).toLocaleDateString()}</p>
              <p className="text-xs text-muted-foreground">Bundle gzip: {item.bundleGzipKb ? `${item.bundleGzipKb} KB` : "n/a"}</p>
              <div className="text-xs flex flex-wrap gap-3">
                {item.package.links?.npm && <a className="underline" href={item.package.links.npm} target="_blank" rel="noreferrer">npm</a>}
                {item.package.links?.repository && <a className="underline" href={item.package.links.repository} target="_blank" rel="noreferrer">repo</a>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </ToolPageShell>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface PyPiData {
  info: {
    name: string;
    summary: string;
    version: string;
    author: string;
    license: string;
    home_page: string;
    project_url: string;
    package_url: string;
  };
}

export default function PyPiSearchPage() {
  const [query, setQuery] = useState("requests");
  const [result, setResult] = useState<PyPiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`https://pypi.org/pypi/${encodeURIComponent(query.trim())}/json`);
      if (!response.ok) {
        throw new Error("Package not found");
      }
      const data = (await response.json()) as PyPiData;
      setResult(data);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "PyPI lookup failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="PyPI Package Search"
      description="Lookup package metadata from PyPI including version, author, license, and project links."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="fastapi" className="max-w-sm" />
          <Button onClick={() => void search()} disabled={loading}>{loading ? "Searching..." : "Search"}</Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && (
          <article className="rounded-xl border p-4 space-y-2 text-sm">
            <h2 className="text-xl font-medium">{result.info.name} <span className="text-sm text-muted-foreground">v{result.info.version}</span></h2>
            <p className="text-muted-foreground">{result.info.summary}</p>
            <p>Author: {result.info.author || "Unknown"}</p>
            <p>License: {result.info.license || "Unknown"}</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <a className="underline" href={result.info.package_url} target="_blank" rel="noreferrer">PyPI page</a>
              {result.info.home_page && <a className="underline" href={result.info.home_page} target="_blank" rel="noreferrer">Home</a>}
              {result.info.project_url && <a className="underline" href={result.info.project_url} target="_blank" rel="noreferrer">Project</a>}
            </div>
          </article>
        )}
      </div>
    </ToolPageShell>
  );
}

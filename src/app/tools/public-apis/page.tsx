"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface PublicApiEntry {
  API: string;
  Description: string;
  Auth: string;
  HTTPS: boolean;
  Cors: string;
  Category: string;
  Link: string;
}

export default function PublicApisPage() {
  const [entries, setEntries] = useState<PublicApiEntry[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [auth, setAuth] = useState("all");
  const [httpsOnly, setHttpsOnly] = useState(false);
  const [corsFilter, setCorsFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://api.publicapis.org/entries");
      const data = (await response.json()) as { entries?: PublicApiEntry[] };
      setEntries(data.entries || []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const queryMatch =
        !term ||
        entry.API.toLowerCase().includes(term) ||
        entry.Description.toLowerCase().includes(term) ||
        entry.Category.toLowerCase().includes(term);
      const categoryMatch = category === "all" || entry.Category === category;
      const authMatch = auth === "all" || (auth === "none" ? !entry.Auth : entry.Auth === auth);
      const httpsMatch = !httpsOnly || entry.HTTPS;
      const corsMatch = corsFilter === "all" || entry.Cors.toLowerCase() === corsFilter.toLowerCase();
      return queryMatch && categoryMatch && authMatch && httpsMatch && corsMatch;
    });
  }, [auth, category, corsFilter, entries, httpsOnly, query]);

  const categories = useMemo(() => Array.from(new Set(entries.map((entry) => entry.Category))).sort(), [entries]);
  const authOptions = useMemo(() => Array.from(new Set(entries.map((entry) => entry.Auth).filter(Boolean))).sort(), [entries]);

  return (
    <ToolPageShell
      title="Public API Directory"
      description="Discover free public APIs and filter by category, auth model, HTTPS support, and CORS behavior."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void load()} disabled={loading}>{loading ? "Loading..." : "Load APIs"}</Button>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search APIs" className="max-w-sm" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select value={auth} onChange={(event) => setAuth(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="all">All auth</option>
            <option value="none">No auth</option>
            {authOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <select value={corsFilter} onChange={(event) => setCorsFilter(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="all">All CORS</option>
            <option value="yes">yes</option>
            <option value="no">no</option>
            <option value="unknown">unknown</option>
          </select>

          <label className="inline-flex items-center gap-2 text-sm rounded-md border px-3 py-2">
            <input type="checkbox" checked={httpsOnly} onChange={(event) => setHttpsOnly(event.target.checked)} />
            HTTPS only
          </label>

          <p className="text-sm text-muted-foreground self-center">{filtered.length} results</p>
        </div>

        <div className="space-y-2">
          {filtered.slice(0, 200).map((entry) => (
            <article key={`${entry.API}-${entry.Link}`} className="rounded-xl border p-3 space-y-1">
              <a href={entry.Link} target="_blank" rel="noreferrer" className="font-medium hover:underline">{entry.API}</a>
              <p className="text-sm text-muted-foreground">{entry.Description}</p>
              <p className="text-xs text-muted-foreground">Category: {entry.Category} · Auth: {entry.Auth || "None"} · HTTPS: {entry.HTTPS ? "Yes" : "No"} · CORS: {entry.Cors}</p>
            </article>
          ))}
        </div>
      </div>
    </ToolPageShell>
  );
}

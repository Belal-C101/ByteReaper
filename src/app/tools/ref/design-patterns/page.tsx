"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { DESIGN_PATTERNS } from "@/lib/tools/reference-data";

export default function DesignPatternsReferencePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | "Creational" | "Structural" | "Behavioral">("all");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return DESIGN_PATTERNS.filter((item) => {
      const categoryMatch = category === "all" || item.category === category;
      const queryMatch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.intent.toLowerCase().includes(term) ||
        item.whenToUse.toLowerCase().includes(term);
      return categoryMatch && queryMatch;
    });
  }, [category, query]);

  return (
    <ToolPageShell
      title="Design Patterns Reference"
      description="Search TypeScript-oriented design patterns with intent, usage notes, examples, and quick diagrams."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patterns" className="max-w-sm" />
          <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="all">All</option>
            <option value="Creational">Creational</option>
            <option value="Structural">Structural</option>
            <option value="Behavioral">Behavioral</option>
          </select>
        </div>

        <div className="space-y-3">
          {filtered.map((pattern) => (
            <details key={pattern.name} className="rounded-lg border p-3" open>
              <summary className="cursor-pointer font-medium">
                {pattern.name} <span className="text-muted-foreground text-xs">({pattern.category})</span>
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                <p><span className="font-medium">Intent:</span> {pattern.intent}</p>
                <p><span className="font-medium">When to use:</span> {pattern.whenToUse}</p>
                <div>
                  <p className="font-medium mb-1">TypeScript snippet</p>
                  <pre className="rounded bg-muted p-2 text-xs overflow-auto">{pattern.example}</pre>
                </div>
                <div>
                  <p className="font-medium mb-1">Diagram</p>
                  <pre className="rounded bg-muted p-2 text-xs overflow-auto">{pattern.diagram}</pre>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </ToolPageShell>
  );
}

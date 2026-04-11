"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { CopyButton } from "@/components/tools/copy-button";
import { GIT_COMMANDS } from "@/lib/tools/reference-data";

export default function GitReferencePage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return GIT_COMMANDS.filter((item) => {
      if (!term) return true;
      return (
        item.command.toLowerCase().includes(term) ||
        item.explanation.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );
    });
  }, [query]);

  return (
    <ToolPageShell
      title="Git Cheatsheet"
      description="Find common Git commands by category, with practical examples and one-click copy."
    >
      <div className="space-y-4">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search git commands" />

        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={`${item.category}-${item.command}`} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm">{item.command}</p>
                <CopyButton value={item.command} label="Copy" />
              </div>
              <p className="text-sm text-muted-foreground">{item.explanation}</p>
              <p className="text-xs text-muted-foreground">Category: {item.category}</p>
              <code className="block text-xs rounded bg-muted px-2 py-1">{item.example}</code>
            </div>
          ))}
        </div>
      </div>
    </ToolPageShell>
  );
}

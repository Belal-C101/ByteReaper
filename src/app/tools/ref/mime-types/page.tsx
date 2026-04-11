"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { MIME_TYPES } from "@/lib/tools/reference-data";

const CATEGORIES = ["all", "text", "image", "audio", "video", "application"] as const;

export default function MimeTypesReferencePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return MIME_TYPES.filter((item) => {
      const categoryMatch = category === "all" || item.category === category;
      const queryMatch =
        !term ||
        item.mime.toLowerCase().includes(term) ||
        item.extensions.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term);
      return categoryMatch && queryMatch;
    });
  }, [category, query]);

  return (
    <ToolPageShell
      title="MIME Types Reference"
      description="Search MIME types by extension, type, or category for quick content-type lookup."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search MIME or extension" className="max-w-sm" />
          <select value={category} onChange={(event) => setCategory(event.target.value as (typeof CATEGORIES)[number])} className="h-9 rounded-md border bg-background px-2 text-sm">
            {CATEGORIES.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2">MIME Type</th>
                <th className="text-left px-3 py-2">Extensions</th>
                <th className="text-left px-3 py-2">Category</th>
                <th className="text-left px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.mime} className="border-t border-border/50">
                  <td className="px-3 py-2 font-mono text-xs">{item.mime}</td>
                  <td className="px-3 py-2">{item.extensions}</td>
                  <td className="px-3 py-2 capitalize">{item.category}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ToolPageShell>
  );
}

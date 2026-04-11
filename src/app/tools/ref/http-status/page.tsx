"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { HTTP_STATUS_CODES } from "@/lib/tools/reference-data";

export default function HttpStatusReferencePage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return HTTP_STATUS_CODES.filter((item) => {
      if (!term) return true;
      return (
        item.code.toString().includes(term) ||
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
      );
    });
  }, [query]);

  return (
    <ToolPageShell
      title="HTTP Status Codes"
      description="Search and inspect HTTP status codes grouped by class with practical usage guidance."
    >
      <div className="space-y-4">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by code or phrase" />

        <div className="space-y-2">
          {filtered.map((item) => (
            <details key={item.code} className="rounded-lg border p-3">
              <summary className="cursor-pointer flex items-center gap-2">
                <Badge variant="outline">{item.code}</Badge>
                <span className="font-medium">{item.name}</span>
              </summary>
              <div className="mt-2 text-sm space-y-1 text-muted-foreground">
                <p>{item.description}</p>
                <p><span className="text-foreground font-medium">Common use case:</span> {item.useCase}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </ToolPageShell>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { SHORTCUTS } from "@/lib/tools/reference-data";

const SCOPES = ["VS Code", "Chrome DevTools", "Terminal", "Vim", "GitHub"] as const;

type Scope = (typeof SCOPES)[number];

export default function ShortcutsReferencePage() {
  const [scope, setScope] = useState<Scope>("VS Code");
  const [os, setOs] = useState<"windows" | "mac">("windows");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return SHORTCUTS.filter((item) => {
      const scopeMatch = item.scope === scope;
      const queryMatch = !term || item.action.toLowerCase().includes(term) || item.windows.toLowerCase().includes(term) || item.mac.toLowerCase().includes(term);
      return scopeMatch && queryMatch;
    });
  }, [query, scope]);

  return (
    <ToolPageShell
      title="Keyboard Shortcuts Reference"
      description="Browse common shortcuts for coding tools with quick OS-specific key combos."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {SCOPES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setScope(entry)}
              className={`rounded-full border px-3 py-1.5 text-sm ${scope === entry ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
            >
              {entry}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions" className="max-w-sm" />
          <button type="button" onClick={() => setOs("windows")} className={`rounded-md border px-3 py-2 text-sm ${os === "windows" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
            Windows
          </button>
          <button type="button" onClick={() => setOs("mac")} className={`rounded-md border px-3 py-2 text-sm ${os === "mac" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
            Mac
          </button>
        </div>

        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2">Action</th>
                <th className="text-left px-3 py-2">Shortcut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={`${item.scope}-${item.action}`} className="border-t border-border/50">
                  <td className="px-3 py-2">{item.action}</td>
                  <td className="px-3 py-2 font-mono text-xs">{os === "windows" ? item.windows : item.mac}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ToolPageShell>
  );
}

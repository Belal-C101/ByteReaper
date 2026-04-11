"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface MatchRow {
  value: string;
  index: number;
  groups: string[];
}

const COMMON_PATTERNS = [
  { label: "Email", pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
  { label: "URL", pattern: "https?:\\/\\/[\\w.-]+(?:\\.[\\w.-]+)+(?:[\\w\\-._~:/?#[\\]@!$&'()*+,;=]*)?" },
  { label: "IPv4", pattern: "^(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}$" },
  { label: "Phone", pattern: "^\\+?[0-9()\\-\\s]{7,20}$" },
  { label: "Hex Color", pattern: "^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$" },
];

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState("(ByteReaper)");
  const [flags, setFlags] = useState("gi");
  const [text, setText] = useState("ByteReaper helps ByteReaper users ship faster.");

  const result = useMemo(() => {
    try {
      const regex = new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
      const matches: MatchRow[] = [];
      let current: RegExpExecArray | null = regex.exec(text);

      while (current) {
        matches.push({
          value: current[0],
          index: current.index,
          groups: current.slice(1),
        });
        current = regex.exec(text);
      }

      return { error: "", matches };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Invalid regex",
        matches: [] as MatchRow[],
      };
    }
  }, [pattern, flags, text]);

  const highlightedParts = useMemo(() => {
    if (result.error || result.matches.length === 0) {
      return [{ text, hit: false }];
    }

    const parts: Array<{ text: string; hit: boolean }> = [];
    let cursor = 0;
    for (const match of result.matches) {
      if (match.index > cursor) {
        parts.push({ text: text.slice(cursor, match.index), hit: false });
      }
      parts.push({ text: match.value, hit: true });
      cursor = match.index + match.value.length;
    }
    if (cursor < text.length) {
      parts.push({ text: text.slice(cursor), hit: false });
    }
    return parts;
  }, [result, text]);

  return (
    <ToolPageShell
      title="Regex Tester"
      description="Test regular expressions with live highlighting, match metadata, and ready-to-use common patterns."
    >
      <div className="grid xl:grid-cols-[280px_1fr] gap-4">
        <aside className="rounded-xl border p-3 space-y-2">
          <h2 className="font-medium">Common Patterns</h2>
          {COMMON_PATTERNS.map((entry) => (
            <button
              key={entry.label}
              type="button"
              className="w-full text-left text-sm rounded-md border px-2 py-1.5 hover:bg-accent"
              onClick={() => setPattern(entry.pattern)}
            >
              {entry.label}
            </button>
          ))}
        </aside>

        <div className="space-y-4">
          <div className="grid md:grid-cols-[1fr_120px] gap-3">
            <div className="space-y-2">
              <label htmlFor="regex-pattern" className="text-sm font-medium">Pattern</label>
              <Input
                id="regex-pattern"
                value={pattern}
                onChange={(event) => setPattern(event.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="regex-flags" className="text-sm font-medium">Flags</label>
              <Input
                id="regex-flags"
                value={flags}
                onChange={(event) => setFlags(event.target.value.replace(/[^gimsuy]/g, ""))}
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="regex-text" className="text-sm font-medium">Test Text</label>
            <Textarea
              id="regex-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-[180px] font-mono text-sm"
            />
          </div>

          {result.error ? (
            <p className="text-sm text-destructive">{result.error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Found {result.matches.length} matches.</p>
          )}

          <div className="rounded-xl border p-3 min-h-[120px] bg-background/60 leading-relaxed whitespace-pre-wrap break-words font-mono text-sm">
            {highlightedParts.map((part, index) => (
              <span key={`${part.text}-${index}`} className={part.hit ? "bg-primary/20 rounded px-0.5" : ""}>
                {part.text}
              </span>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Match Details</h3>
            <div className="space-y-2">
              {result.matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matches yet.</p>
              ) : (
                result.matches.map((match, index) => (
                  <div key={`${match.value}-${match.index}-${index}`} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <Badge variant="secondary">index {match.index}</Badge>
                      <code className="text-xs rounded bg-muted px-2 py-1">{match.value}</code>
                    </div>
                    {match.groups.length > 0 && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">Capture groups</p>
                        <ul className="flex flex-wrap gap-2 mt-1">
                          {match.groups.map((group, groupIndex) => (
                            <li key={`${group}-${groupIndex}`} className="text-xs rounded bg-muted px-2 py-1">
                              ${groupIndex + 1}: {group || "(empty)"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => {
              setPattern("");
              setFlags("g");
              setText("");
            }}
          >
            Clear
          </Button>
        </div>
      </div>
    </ToolPageShell>
  );
}

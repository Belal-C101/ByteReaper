"use client";

import { useMemo, useState } from "react";
import { createPatch } from "diff";
import { ArrowLeftRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

export default function DiffViewerPage() {
  const [original, setOriginal] = useState("const answer = 41;\nconsole.log(answer);");
  const [modified, setModified] = useState("const answer = 42;\nconsole.log('value:', answer);");

  const unifiedDiff = useMemo(
    () =>
      createPatch("input.txt", original, modified, "original", "modified", {
        context: 3,
      }),
    [original, modified],
  );

  return (
    <ToolPageShell
      title="Diff Viewer"
      description="Compare two texts side-by-side and inspect a unified diff with line-aware color coding."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const left = original;
              setOriginal(modified);
              setModified(left);
            }}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Swap sides
          </Button>
          <CopyButton value={unifiedDiff} label="Copy diff" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Original</h2>
            <Textarea
              value={original}
              onChange={(event) => setOriginal(event.target.value)}
              className="min-h-[220px] font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Modified</h2>
            <Textarea
              value={modified}
              onChange={(event) => setModified(event.target.value)}
              className="min-h-[220px] font-mono text-sm"
            />
          </div>
        </div>

        <section className="rounded-xl border overflow-hidden">
          <div className="px-3 py-2 border-b text-sm font-medium">Unified Diff</div>
          <div className="max-h-[360px] overflow-auto">
            {unifiedDiff.split("\n").map((line, index) => {
              const colorClass = line.startsWith("+")
                ? "bg-emerald-500/10 text-emerald-400"
                : line.startsWith("-")
                  ? "bg-red-500/10 text-red-400"
                  : "";
              return (
                <div key={`${line}-${index}`} className={`grid grid-cols-[56px_1fr] font-mono text-xs ${colorClass}`}>
                  <span className="px-2 py-1 text-right text-muted-foreground border-r border-border/50">{index + 1}</span>
                  <span className="px-3 py-1 whitespace-pre-wrap break-all">{line}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </ToolPageShell>
  );
}

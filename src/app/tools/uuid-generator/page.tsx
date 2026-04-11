"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function UuidGeneratorPage() {
  const [count, setCount] = useState("5");
  const [uuids, setUuids] = useState<string[]>([]);
  const [validationInput, setValidationInput] = useState("");

  const generate = () => {
    const parsedCount = Math.max(1, Math.min(100, Number(count) || 1));
    const result = Array.from({ length: parsedCount }, () => crypto.randomUUID());
    setUuids(result);
  };

  const validation = useMemo(() => {
    if (!validationInput.trim()) return "";
    return UUID_REGEX.test(validationInput.trim()) ? "Valid UUID" : "Invalid UUID";
  }, [validationInput]);

  return (
    <ToolPageShell
      title="UUID Generator"
      description="Generate UUID v4 values in bulk, copy results, use nil UUID, and validate arbitrary UUID input."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={count}
            onChange={(event) => setCount(event.target.value)}
            className="w-24"
            aria-label="Count"
          />
          <Button onClick={generate}>Generate</Button>
          <Button variant="outline" onClick={() => setUuids([NIL_UUID])}>Use Nil UUID</Button>
          <CopyButton value={uuids.join("\n")} label="Copy all" />
          <Button variant="ghost" onClick={() => setUuids([])}>Clear</Button>
        </div>

        <div className="rounded-xl border p-3 space-y-2 min-h-[160px]">
          {uuids.length === 0 ? (
            <p className="text-sm text-muted-foreground">Generate UUIDs to see results.</p>
          ) : (
            uuids.map((uuid) => (
              <div key={uuid} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                <code className="text-xs md:text-sm break-all">{uuid}</code>
                <CopyButton value={uuid} label="Copy" />
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium">UUID Validation</h2>
          <Input value={validationInput} onChange={(event) => setValidationInput(event.target.value)} placeholder="Paste a UUID" />
          {validation && <p className={`text-sm ${validation.startsWith("Valid") ? "text-emerald-500" : "text-destructive"}`}>{validation}</p>}
        </div>
      </div>
    </ToolPageShell>
  );
}

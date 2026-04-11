"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function getLineFromPosition(source: string, position: number): number {
  return source.slice(0, position).split("\n").length;
}

function JsonTree({ value, name = "root" }: { value: JsonValue; name?: string }) {
  if (value === null || typeof value !== "object") {
    return (
      <div className="text-sm">
        <span className="text-muted-foreground">{name}: </span>
        <span>{String(value)}</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <details open className="pl-3 border-l border-border/60">
        <summary className="cursor-pointer text-sm">
          {name} <span className="text-muted-foreground">[{value.length}]</span>
        </summary>
        <div className="space-y-1 mt-1">
          {value.map((entry, index) => (
            <JsonTree key={`${name}-${index}`} name={`[${index}]`} value={entry} />
          ))}
        </div>
      </details>
    );
  }

  return (
    <details open className="pl-3 border-l border-border/60">
      <summary className="cursor-pointer text-sm">
        {name} <span className="text-muted-foreground">{"{"}{Object.keys(value).length}{"}"}</span>
      </summary>
      <div className="space-y-1 mt-1">
        {Object.entries(value).map(([key, entry]) => (
          <JsonTree key={`${name}-${key}`} name={key} value={entry} />
        ))}
      </div>
    </details>
  );
}

export default function JsonFormatterPage() {
  const [input, setInput] = useState('{\n  "name": "ByteReaper",\n  "features": ["chat", "analysis"],\n  "free": true\n}');
  const [output, setOutput] = useState("");
  const [indentSize, setIndentSize] = useState("2");
  const [useTabs, setUseTabs] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const [error, setError] = useState("");
  const [valid, setValid] = useState(false);

  const parsedJson = useMemo(() => {
    try {
      if (!input.trim()) return null;
      return JSON.parse(input) as JsonValue;
    } catch {
      return null;
    }
  }, [input]);

  const formatJson = (minify = false) => {
    try {
      const parsed = JSON.parse(input) as JsonValue;
      const spacer = minify ? 0 : useTabs ? "\t" : Number(indentSize);
      const result = JSON.stringify(parsed, null, spacer);
      setOutput(result);
      setError("");
      setValid(true);
    } catch (formatError) {
      const message = formatError instanceof Error ? formatError.message : "Invalid JSON";
      const match = message.match(/position\s(\d+)/i);
      if (match) {
        const line = getLineFromPosition(input, Number(match[1]));
        setError(`${message} (line ${line})`);
      } else {
        setError(message);
      }
      setValid(false);
      setOutput("");
    }
  };

  return (
    <ToolPageShell
      title="JSON Formatter & Validator"
      description="Prettify and validate JSON with indentation controls, minify mode, and a structural tree view."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="indent" className="text-sm text-muted-foreground">Indent</label>
            <Input
              id="indent"
              value={indentSize}
              onChange={(event) => setIndentSize(event.target.value)}
              className="w-16 h-8"
              disabled={useTabs}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useTabs} onChange={(event) => setUseTabs(event.target.checked)} />
            Use tabs
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showTree} onChange={(event) => setShowTree(event.target.checked)} />
            Tree view
          </label>

          <Button size="sm" onClick={() => formatJson(false)}>Format</Button>
          <Button size="sm" variant="outline" onClick={() => formatJson(true)}>Minify</Button>
          <CopyButton value={output || input} />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setInput("");
              setOutput("");
              setError("");
              setValid(false);
            }}
          >
            Clear
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : valid ? (
          <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            JSON is valid
          </div>
        ) : null}

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Input</h2>
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[320px] font-mono text-sm"
              placeholder="Paste JSON here"
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-medium">Output</h2>
            {!showTree && (
              <Textarea
                value={output}
                onChange={(event) => setOutput(event.target.value)}
                className="min-h-[320px] font-mono text-sm"
                placeholder="Formatted JSON appears here"
              />
            )}
            {showTree && (
              <div className="min-h-[320px] rounded-md border p-3 overflow-auto">
                {parsedJson ? <JsonTree value={parsedJson} /> : <p className="text-sm text-muted-foreground">Provide valid JSON to inspect tree.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

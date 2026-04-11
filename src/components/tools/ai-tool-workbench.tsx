"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/tools/copy-button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { streamToolResponse } from "@/lib/ai/tool-helpers";
import { AiToolPromptKey } from "@/lib/ai/tool-prompts";

interface ToolField {
  key: string;
  label: string;
  placeholder?: string;
  type: "input" | "select";
  options?: string[];
  defaultValue?: string;
}

interface AiToolWorkbenchProps {
  tool: AiToolPromptKey;
  title: string;
  description: string;
  inputLabel: string;
  inputPlaceholder: string;
  inputDefault?: string;
  fields?: ToolField[];
  composePrompt?: (input: string, fieldValues: Record<string, string>) => string;
  markdownPreview?: boolean;
}

export function AiToolWorkbench(props: AiToolWorkbenchProps) {
  const {
    tool,
    title,
    description,
    inputLabel,
    inputPlaceholder,
    inputDefault = "",
    fields = [],
    composePrompt,
    markdownPreview = false,
  } = props;

  const initialFieldState = useMemo(
    () =>
      fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = field.defaultValue || "";
        return acc;
      }, {}),
    [fields],
  );

  const [input, setInput] = useState(inputDefault);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(initialFieldState);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolvedModel, setResolvedModel] = useState("");

  const handleGenerate = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError("");
    setOutput("");
    setResolvedModel("");

    const prompt = composePrompt
      ? composePrompt(input, fieldValues)
      : `${inputLabel}:\n${input}\n\nOptions:\n${Object.entries(fieldValues)
          .map(([key, value]) => `- ${key}: ${value || "n/a"}`)
          .join("\n")}`;

    try {
      await streamToolResponse({
        tool,
        userInput: prompt,
        onModel: (model) => setResolvedModel(model),
        onChunk: (chunk) => setOutput((current) => current + chunk),
      });
    } catch (streamError) {
      setError(streamError instanceof Error ? streamError.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell title={title} description={description}>
      <div className="space-y-4">
        {fields.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="text-xs text-muted-foreground">{field.label}</label>
                {field.type === "input" ? (
                  <Input
                    value={fieldValues[field.key] || ""}
                    onChange={(event) => setFieldValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <select
                    value={fieldValues[field.key] || field.options?.[0] || ""}
                    onChange={(event) => setFieldValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="h-10 rounded-md border bg-background px-2 text-sm w-full"
                  >
                    {field.options?.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">{inputLabel}</label>
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={inputPlaceholder}
            className="min-h-[180px] font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void handleGenerate()} disabled={loading || !input.trim()}>
            {loading ? "Generating..." : "Generate"}
          </Button>
          <CopyButton value={output} />
          <Button
            variant="ghost"
            onClick={() => {
              setInput(inputDefault);
              setOutput("");
              setError("");
              setResolvedModel("");
              setFieldValues(initialFieldState);
            }}
          >
            Clear
          </Button>
          {resolvedModel && <span className="text-xs text-muted-foreground">Model: {resolvedModel}</span>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <section className="rounded-xl border p-3 space-y-2">
          <h2 className="font-medium">Output</h2>
          {markdownPreview ? (
            <div className="prose prose-invert max-w-none dark:prose-invert min-h-[220px]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{output || "_No output yet._"}</ReactMarkdown>
            </div>
          ) : (
            <Textarea value={output} onChange={(event) => setOutput(event.target.value)} className="min-h-[220px] font-mono text-sm" />
          )}
        </section>
      </div>
    </ToolPageShell>
  );
}

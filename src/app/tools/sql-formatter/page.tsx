"use client";

import { useState } from "react";
import { format } from "sql-formatter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/tools/copy-button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

type Dialect = "mysql" | "postgresql" | "sqlite" | "transactsql";

export default function SqlFormatterPage() {
  const [sql, setSql] = useState("select id,name from users where active=1 order by created_at desc;");
  const [output, setOutput] = useState("");
  const [dialect, setDialect] = useState<Dialect>("postgresql");
  const [error, setError] = useState("");

  const runFormat = (minify: boolean) => {
    try {
      const result = format(sql, {
        language: dialect,
        tabWidth: 2,
        linesBetweenQueries: minify ? 0 : 1,
        keywordCase: "upper",
      });

      if (minify) {
        setOutput(result.replace(/\s+/g, " ").trim());
      } else {
        setOutput(result);
      }
      setError("");
    } catch (formatError) {
      setError(formatError instanceof Error ? formatError.message : "Formatting failed");
    }
  };

  return (
    <ToolPageShell
      title="SQL Formatter"
      description="Format and minify SQL queries with support for MySQL, PostgreSQL, SQLite, and T-SQL dialects."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select value={dialect} onChange={(event) => setDialect(event.target.value as Dialect)} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="mysql">MySQL</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="sqlite">SQLite</option>
            <option value="transactsql">T-SQL</option>
          </select>
          <Button size="sm" onClick={() => runFormat(false)}>Format</Button>
          <Button size="sm" variant="outline" onClick={() => runFormat(true)}>Minify</Button>
          <CopyButton value={output} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Input SQL</h2>
            <Textarea value={sql} onChange={(event) => setSql(event.target.value)} className="min-h-[260px] font-mono text-sm" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Formatted SQL</h2>
            <pre className="min-h-[260px] rounded-md border p-3 font-mono text-xs overflow-auto whitespace-pre-wrap bg-background/60">
              {output}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

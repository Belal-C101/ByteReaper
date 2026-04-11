"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface HeaderRow {
  id: string;
  key: string;
  value: string;
}

interface ApiResponse {
  status: number;
  statusText: string;
  responseTimeMs: number;
  headers: Record<string, string>;
  body: string;
}

interface RequestHistoryItem {
  method: string;
  url: string;
  createdAt: string;
}

function emptyHeader(): HeaderRow {
  return { id: crypto.randomUUID(), key: "", value: "" };
}

export default function ApiTesterPage() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("https://api.github.com/repos/Belal-C101/ByteReaper");
  const [headers, setHeaders] = useState<HeaderRow[]>([{ id: crypto.randomUUID(), key: "Accept", value: "application/json" }]);
  const [body, setBody] = useState("{}");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);

  const parsedResponseBody = useMemo(() => {
    if (!response?.body) return "";
    try {
      return JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      return response.body;
    }
  }, [response]);

  const sendRequest = async () => {
    setLoading(true);
    setError("");
    try {
      const headerMap = headers
        .filter((entry) => entry.key.trim())
        .reduce<Record<string, string>>((acc, entry) => {
          acc[entry.key.trim()] = entry.value;
          return acc;
        }, {});

      const result = await fetch("/api/tools/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          method,
          headers: headerMap,
          body,
        }),
      });

      const data = (await result.json()) as ApiResponse & { error?: string };
      if (!result.ok) {
        throw new Error(data.error || "Request failed");
      }

      setResponse(data);
      setHistory((current) => [{ method, url, createdAt: new Date().toISOString() }, ...current].slice(0, 10));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Request failed");
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="HTTP Request Tester"
      description="Send HTTP requests through a server-side proxy, inspect response metadata, and keep a session history."
    >
      <div className="space-y-4">
        <div className="grid md:grid-cols-[130px_1fr_auto] gap-2">
          <select value={method} onChange={(event) => setMethod(event.target.value)} className="h-10 rounded-md border bg-background px-2">
            {[
              "GET",
              "POST",
              "PUT",
              "PATCH",
              "DELETE",
              "HEAD",
              "OPTIONS",
            ].map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
          <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://api.example.com" />
          <Button onClick={() => void sendRequest()} disabled={loading}>{loading ? "Sending..." : "Send"}</Button>
        </div>

        <section className="rounded-xl border p-3 space-y-2">
          <h2 className="font-medium">Headers</h2>
          {headers.map((header) => (
            <div key={header.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input value={header.key} onChange={(event) => setHeaders((current) => current.map((entry) => (entry.id === header.id ? { ...entry, key: event.target.value } : entry)))} placeholder="Header" />
              <Input value={header.value} onChange={(event) => setHeaders((current) => current.map((entry) => (entry.id === header.id ? { ...entry, value: event.target.value } : entry)))} placeholder="Value" />
              <Button variant="ghost" onClick={() => setHeaders((current) => current.filter((entry) => entry.id !== header.id))}>Remove</Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setHeaders((current) => [...current, emptyHeader()])}>Add header</Button>
        </section>

        <section className="rounded-xl border p-3 space-y-2">
          <h2 className="font-medium">Body</h2>
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} className="min-h-[120px] font-mono text-sm" />
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {response && (
          <section className="rounded-xl border p-3 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <p>Status: <strong>{response.status} {response.statusText}</strong></p>
              <p>Time: <strong>{response.responseTimeMs}ms</strong></p>
            </div>
            <pre className="rounded bg-muted p-2 text-xs overflow-auto">{JSON.stringify(response.headers, null, 2)}</pre>
            <Textarea value={parsedResponseBody} readOnly className="min-h-[180px] font-mono text-xs" />
          </section>
        )}

        <section className="rounded-xl border p-3 space-y-2">
          <h2 className="font-medium">Recent requests</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests in this session yet.</p>
          ) : (
            history.map((entry) => (
              <button
                key={`${entry.method}-${entry.url}-${entry.createdAt}`}
                type="button"
                onClick={() => {
                  setMethod(entry.method);
                  setUrl(entry.url);
                }}
                className="w-full text-left rounded-md border px-2 py-2 text-sm hover:bg-accent"
              >
                [{entry.method}] {entry.url}
              </button>
            ))
          )}
        </section>
      </div>
    </ToolPageShell>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { CopyButton } from "@/components/tools/copy-button";

interface QueryPair {
  id: string;
  key: string;
  value: string;
}

function emptyPair(): QueryPair {
  return { id: crypto.randomUUID(), key: "", value: "" };
}

export default function UrlEncoderPage() {
  const [input, setInput] = useState("https://example.com/docs?tab=api#intro");
  const [encoded, setEncoded] = useState("");
  const [decoded, setDecoded] = useState("");

  const [protocol, setProtocol] = useState("https:");
  const [host, setHost] = useState("example.com");
  const [port, setPort] = useState("");
  const [path, setPath] = useState("/");
  const [fragment, setFragment] = useState("");
  const [queryPairs, setQueryPairs] = useState<QueryPair[]>([emptyPair()]);

  const builtUrl = useMemo(() => {
    const search = queryPairs
      .filter((pair) => pair.key.trim())
      .map((pair) => `${encodeURIComponent(pair.key)}=${encodeURIComponent(pair.value)}`)
      .join("&");

    const portSegment = port.trim() ? `:${port.trim()}` : "";
    const pathSegment = path.startsWith("/") ? path : `/${path}`;
    const hashSegment = fragment.trim() ? `#${fragment.trim()}` : "";

    return `${protocol}//${host}${portSegment}${pathSegment}${search ? `?${search}` : ""}${hashSegment}`;
  }, [fragment, host, path, port, protocol, queryPairs]);

  const parseUrl = () => {
    try {
      const url = new URL(input);
      setProtocol(url.protocol || "https:");
      setHost(url.hostname);
      setPort(url.port);
      setPath(url.pathname || "/");
      setFragment(url.hash.replace("#", ""));
      const params = Array.from(url.searchParams.entries());
      setQueryPairs(params.length > 0 ? params.map(([key, value]) => ({ id: crypto.randomUUID(), key, value })) : [emptyPair()]);
    } catch {
      // Ignore parse errors to keep editing flow smooth.
    }
  };

  return (
    <ToolPageShell
      title="URL Encoder/Decoder"
      description="Encode and decode URL components, parse complete URLs, and rebuild URLs from editable parts."
    >
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <section className="rounded-xl border p-3 space-y-2">
            <h2 className="font-medium">Encode / Decode</h2>
            <Textarea value={input} onChange={(event) => setInput(event.target.value)} className="min-h-[120px] font-mono text-sm" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setEncoded(encodeURIComponent(input))}>Encode component</Button>
              <Button size="sm" variant="outline" onClick={() => setDecoded(decodeURIComponent(input))}>Decode component</Button>
              <Button size="sm" variant="secondary" onClick={parseUrl}>Parse URL</Button>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Encoded</p>
              <p className="font-mono text-xs break-all">{encoded}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Decoded</p>
              <p className="font-mono text-xs break-all">{decoded}</p>
            </div>
          </section>

          <section className="rounded-xl border p-3 space-y-2">
            <h2 className="font-medium">Build URL</h2>
            <div className="grid grid-cols-2 gap-2">
              <Input value={protocol} onChange={(event) => setProtocol(event.target.value)} placeholder="https:" />
              <Input value={host} onChange={(event) => setHost(event.target.value)} placeholder="example.com" />
              <Input value={port} onChange={(event) => setPort(event.target.value)} placeholder="443" />
              <Input value={path} onChange={(event) => setPath(event.target.value)} placeholder="/docs" />
            </div>
            <Input value={fragment} onChange={(event) => setFragment(event.target.value)} placeholder="fragment" />

            <div className="space-y-2">
              <p className="text-sm font-medium">Query Params</p>
              {queryPairs.map((pair) => (
                <div key={pair.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    value={pair.key}
                    onChange={(event) => setQueryPairs((current) => current.map((entry) => (entry.id === pair.id ? { ...entry, key: event.target.value } : entry)))}
                    placeholder="key"
                  />
                  <Input
                    value={pair.value}
                    onChange={(event) => setQueryPairs((current) => current.map((entry) => (entry.id === pair.id ? { ...entry, value: event.target.value } : entry)))}
                    placeholder="value"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQueryPairs((current) => current.filter((entry) => entry.id !== pair.id))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setQueryPairs((current) => [...current, emptyPair()])}>Add param</Button>
            </div>
          </section>
        </div>

        <section className="rounded-xl border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">Result URL</h3>
            <CopyButton value={builtUrl} />
          </div>
          <p className="font-mono text-xs break-all">{builtUrl}</p>
        </section>
      </div>
    </ToolPageShell>
  );
}

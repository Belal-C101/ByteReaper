"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

type RecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA";

const DNS_TYPES: RecordType[] = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA"];

interface DnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

export default function DnsLookupPage() {
  const [domain, setDomain] = useState("github.com");
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<RecordType>("A");
  const [results, setResults] = useState<Record<RecordType, DnsAnswer[]>>({
    A: [],
    AAAA: [],
    CNAME: [],
    MX: [],
    TXT: [],
    NS: [],
    SOA: [],
  });
  const [error, setError] = useState("");

  const lookup = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setError("");
    try {
      const entries = await Promise.all(
        DNS_TYPES.map(async (type) => {
          const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain.trim())}&type=${type}`);
          const data = (await response.json()) as { Answer?: DnsAnswer[]; Comment?: string };
          return [type, data.Answer ?? []] as const;
        }),
      );

      setResults(entries.reduce<Record<RecordType, DnsAnswer[]>>((acc, [type, answers]) => {
        acc[type] = answers;
        return acc;
      }, { A: [], AAAA: [], CNAME: [], MX: [], TXT: [], NS: [], SOA: [] }));
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "DNS lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const activeAnswers = useMemo(() => results[activeType] || [], [activeType, results]);

  return (
    <ToolPageShell
      title="DNS Lookup"
      description="Query domain DNS records via Google DNS over HTTPS with tabbed results per record type."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" className="max-w-sm" />
          <Button onClick={() => void lookup()} disabled={loading}>{loading ? "Looking up..." : "Lookup"}</Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {DNS_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={`rounded-full border px-3 py-1 text-sm ${activeType === type ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
            >
              {type} ({results[type].length})
            </button>
          ))}
        </div>

        <section className="rounded-xl border p-3 space-y-2">
          <h2 className="font-medium">{activeType} records</h2>
          {activeAnswers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records found for {activeType}.</p>
          ) : (
            activeAnswers.map((answer, index) => (
              <div key={`${answer.data}-${index}`} className="rounded-md border p-2 text-sm">
                <p className="font-mono text-xs break-all">{answer.data}</p>
                <p className="text-xs text-muted-foreground mt-1">TTL: {answer.TTL}</p>
              </div>
            ))
          )}
        </section>
      </div>
    </ToolPageShell>
  );
}

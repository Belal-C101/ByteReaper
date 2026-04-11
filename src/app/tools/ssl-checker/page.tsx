"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface SslData {
  subject: Record<string, string | string[] | undefined>;
  issuer: Record<string, string | string[] | undefined>;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  fingerprint256: string;
  subjectAltNames: string[];
  daysRemaining: number;
  chain: Array<{
    subject: Record<string, string | string[] | undefined>;
    issuer: Record<string, string | string[] | undefined>;
    validTo: string;
  }>;
}

function principalToText(value: Record<string, string | string[] | undefined>): string {
  return Object.values(value)
    .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    .filter(Boolean)
    .join(", ");
}

export default function SslCheckerPage() {
  const [domain, setDomain] = useState("github.com");
  const [result, setResult] = useState<SslData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tools/ssl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      const data = (await response.json()) as SslData & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "SSL lookup failed");
      }

      setResult(data);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "SSL lookup failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="SSL Certificate Checker"
      description="Inspect certificate issuer, validity period, SANs, and full chain details for any domain."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" className="max-w-sm" />
          <Button onClick={() => void lookup()} disabled={loading}>{loading ? "Checking..." : "Check SSL"}</Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && (
          <div className="space-y-3">
            <section className="rounded-xl border p-3 text-sm space-y-1">
              <p><span className="font-medium">Issuer:</span> {principalToText(result.issuer)}</p>
              <p><span className="font-medium">Subject:</span> {principalToText(result.subject)}</p>
              <p><span className="font-medium">Valid from:</span> {result.validFrom}</p>
              <p><span className="font-medium">Valid to:</span> {result.validTo}</p>
              <p><span className="font-medium">Days remaining:</span> {result.daysRemaining}</p>
              <p><span className="font-medium">Serial:</span> {result.serialNumber}</p>
              <p><span className="font-medium">SHA-256 fingerprint:</span> {result.fingerprint256}</p>
            </section>

            <section className="rounded-xl border p-3">
              <h2 className="font-medium mb-2">Subject alternative names</h2>
              <ul className="text-sm text-muted-foreground space-y-1">
                {result.subjectAltNames.map((item) => (
                  <li key={item} className="font-mono text-xs">{item}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border p-3">
              <h2 className="font-medium mb-2">Certificate chain</h2>
              <div className="space-y-2">
                {result.chain.map((entry, index) => (
                  <div key={`${entry.validTo}-${index}`} className="rounded-md border p-2 text-xs">
                    <p><span className="font-medium">Subject:</span> {principalToText(entry.subject)}</p>
                    <p><span className="font-medium">Issuer:</span> {principalToText(entry.issuer)}</p>
                    <p><span className="font-medium">Valid to:</span> {entry.validTo}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </ToolPageShell>
  );
}

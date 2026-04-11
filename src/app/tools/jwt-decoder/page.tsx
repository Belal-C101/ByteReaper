"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

const CLAIM_EXPLANATIONS: Record<string, string> = {
  iss: "Issuer of the token",
  sub: "Subject identifier",
  aud: "Intended audience",
  exp: "Expiration timestamp",
  nbf: "Not valid before timestamp",
  iat: "Issued at timestamp",
  jti: "Unique token identifier",
};

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export default function JwtDecoderPage() {
  const [token, setToken] = useState("");

  const decoded = useMemo(() => {
    const parts = token.trim().split(".");
    if (parts.length !== 3) {
      return { error: "A JWT must contain 3 dot-separated segments.", header: null as Record<string, unknown> | null, payload: null as Record<string, unknown> | null, signature: "" };
    }

    try {
      const header = JSON.parse(decodeBase64Url(parts[0])) as Record<string, unknown>;
      const payload = JSON.parse(decodeBase64Url(parts[1])) as Record<string, unknown>;
      return { error: "", header, payload, signature: parts[2] };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unable to decode JWT.",
        header: null as Record<string, unknown> | null,
        payload: null as Record<string, unknown> | null,
        signature: "",
      };
    }
  }, [token]);

  const expStatus = useMemo(() => {
    const expValue = decoded.payload?.exp;
    if (typeof expValue !== "number") return "no exp";
    const now = Math.floor(Date.now() / 1000);
    return expValue < now ? "expired" : "valid";
  }, [decoded.payload]);

  return (
    <ToolPageShell
      title="JWT Decoder"
      description="Decode token header and payload claims quickly. Signature verification is intentionally not performed."
    >
      <div className="space-y-4">
        <Textarea
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="font-mono text-xs min-h-[120px]"
          placeholder="Paste JWT token here"
        />

        {decoded.error ? (
          <p className="text-sm text-destructive">{decoded.error}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Expiration status:</span>
              <Badge variant={expStatus === "expired" ? "destructive" : expStatus === "valid" ? "secondary" : "outline"}>
                {expStatus}
              </Badge>
            </div>

            <div className="grid lg:grid-cols-3 gap-3">
              <section className="rounded-lg border p-3">
                <h2 className="font-medium mb-2">Header</h2>
                <pre className="text-xs overflow-auto">{JSON.stringify(decoded.header, null, 2)}</pre>
              </section>

              <section className="rounded-lg border p-3">
                <h2 className="font-medium mb-2">Payload</h2>
                <pre className="text-xs overflow-auto">{JSON.stringify(decoded.payload, null, 2)}</pre>
              </section>

              <section className="rounded-lg border p-3">
                <h2 className="font-medium mb-2">Signature</h2>
                <p className="text-xs break-all font-mono">{decoded.signature}</p>
              </section>
            </div>

            <section className="rounded-lg border p-3">
              <h3 className="font-medium mb-2">Claim explanations</h3>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                {Object.entries(decoded.payload ?? {}).map(([key, value]) => (
                  <div key={key} className="rounded-md border p-2">
                    <p className="font-mono text-xs mb-1">{key}: {String(value)}</p>
                    <p className="text-muted-foreground text-xs">{CLAIM_EXPLANATIONS[key] || "Custom claim"}</p>
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

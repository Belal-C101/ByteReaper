import { NextRequest, NextResponse } from "next/server";
import tls from "node:tls";

interface SslRequestBody {
  domain: string;
}

type CertPrincipal = Record<string, string | string[] | undefined>;

interface CertSummary {
  subject: CertPrincipal;
  issuer: CertPrincipal;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  fingerprint256: string;
  subjectAltNames: string[];
  daysRemaining: number;
  chain: Array<{ subject: CertPrincipal; issuer: CertPrincipal; validTo: string }>;
}

function normalizeDomain(input: string): string {
  return input.trim().replace(/^https?:\/\//i, "").replace(/\/.*/, "");
}

function parseAltNames(subjectAltName?: string): string[] {
  if (!subjectAltName) return [];
  return subjectAltName
    .split(",")
    .map((entry) => entry.trim().replace(/^DNS:/, ""))
    .filter(Boolean);
}

function getCertChain(certificate: tls.PeerCertificate): Array<{ subject: CertPrincipal; issuer: CertPrincipal; validTo: string }> {
  const chain: Array<{ subject: CertPrincipal; issuer: CertPrincipal; validTo: string }> = [];
  let current: tls.PeerCertificate | undefined = certificate;

  while (
    current &&
    "issuerCertificate" in current &&
    current.issuerCertificate &&
    current.issuerCertificate !== current
  ) {
    const detailed = current as tls.DetailedPeerCertificate;
    chain.push({
      subject: detailed.subject,
      issuer: detailed.issuer,
      validTo: detailed.valid_to,
    });
    current = detailed.issuerCertificate;
  }

  return chain;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SslRequestBody;
    const domain = normalizeDomain(body.domain || "");

    if (!domain) {
      return NextResponse.json({ error: "Domain is required." }, { status: 400 });
    }

    const summary = await new Promise<CertSummary>((resolve, reject) => {
      const socket = tls.connect(
        {
          host: domain,
          port: 443,
          servername: domain,
          rejectUnauthorized: false,
        },
        () => {
          const cert = socket.getPeerCertificate(true);
          if (!cert || Object.keys(cert).length === 0) {
            socket.end();
            reject(new Error("No certificate information available."));
            return;
          }

          const validToDate = new Date(cert.valid_to);
          const daysRemaining = Math.ceil((validToDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          resolve({
            subject: cert.subject,
            issuer: cert.issuer,
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            serialNumber: cert.serialNumber,
            fingerprint256: cert.fingerprint256,
            subjectAltNames: parseAltNames(cert.subjectaltname),
            daysRemaining,
            chain: getCertChain(cert),
          });

          socket.end();
        },
      );

      socket.setTimeout(10000);
      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("Connection timed out."));
      });
      socket.on("error", (error) => reject(error));
    });

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "SSL lookup failed" }, { status: 500 });
  }
}

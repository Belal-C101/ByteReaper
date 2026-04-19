import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const ALLOWED_HOSTS = new Set([
  "res.cloudinary.com",
  "tmpfiles.org",
]);

function sanitizeFilename(rawName: string | null): string {
  const fallback = "attachment";
  if (!rawName || rawName.trim().length === 0) return fallback;

  const cleaned = rawName
    .replace(/[\r\n\t]/g, " ")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();

  return cleaned.length > 0 ? cleaned : fallback;
}

function buildContentDisposition(disposition: "inline" | "attachment", fileName: string): string {
  const asciiName = fileName.replace(/[^\x20-\x7E]/g, "_");
  const encodedName = encodeURIComponent(fileName);
  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;
}

export async function GET(request: NextRequest) {
  try {
    const sourceUrl = request.nextUrl.searchParams.get("url");
    const rawName = request.nextUrl.searchParams.get("name");
    const dispositionParam = request.nextUrl.searchParams.get("disposition");

    if (!sourceUrl) {
      return NextResponse.json({ error: "Missing url query parameter" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      return NextResponse.json({ error: "Invalid source URL" }, { status: 400 });
    }

    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Only https URLs are supported" }, { status: 400 });
    }

    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return NextResponse.json(
        { error: `Host "${parsed.hostname}" is not in the allowlist` },
        { status: 403 }
      );
    }

    const fileName = sanitizeFilename(rawName);
    const disposition = dispositionParam === "inline" ? "inline" : "attachment";

    const upstream = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Failed to fetch remote file (status ${upstream.status})` },
        { status: 502 }
      );
    }

    const headers = new Headers();
    const upstreamType = upstream.headers.get("content-type") || "application/octet-stream";
    const upstreamLength = upstream.headers.get("content-length");

    headers.set("Content-Type", upstreamType);
    if (upstreamLength) {
      headers.set("Content-Length", upstreamLength);
    }
    headers.set("Content-Disposition", buildContentDisposition(disposition, fileName));
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[File Proxy] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "File proxy failed" },
      { status: 500 }
    );
  }
}

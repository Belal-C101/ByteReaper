import { NextRequest, NextResponse } from "next/server";
import { assertCloudinaryConfigured, cloudinary } from "@/lib/cloudinary/server";

export const maxDuration = 30;

const ALLOWED_HOSTS = new Set([
  "res.cloudinary.com",
  "tmpfiles.org",
]);

const INTERNAL_FETCH_ALLOWED_HOSTS = new Set([
  "res.cloudinary.com",
  "api.cloudinary.com",
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

function buildCloudinaryRawFallbackUrl(source: URL): string | null {
  if (source.hostname !== "res.cloudinary.com") return null;
  if (!source.pathname.includes("/image/upload/")) return null;

  const lowerPath = source.pathname.toLowerCase();
  const documentExts = [
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".txt",
    ".csv",
  ];

  if (!documentExts.some((ext) => lowerPath.endsWith(ext))) return null;

  return source.toString().replace("/image/upload/", "/raw/upload/");
}

function parseCloudinaryAssetFromUrl(source: URL): {
  cloudName: string;
  resourceType: "image" | "raw" | "video";
  deliveryType: string;
  publicId: string;
} | null {
  if (source.hostname !== "res.cloudinary.com") return null;

  const segments = source.pathname.split("/").filter(Boolean);
  if (segments.length < 5) return null;

  // /<cloudName>/<resourceType>/<deliveryType>/<version>/<publicId>
  const resourceType = segments[1];
  if (resourceType !== "image" && resourceType !== "raw" && resourceType !== "video") {
    return null;
  }

  const deliveryType = segments[2];
  const tail = segments.slice(3);
  const versionIndex = tail.findIndex((segment) => /^v\d+$/.test(segment));
  const publicIdSegments = versionIndex >= 0 ? tail.slice(versionIndex + 1) : tail;

  if (publicIdSegments.length === 0) return null;

  return {
    cloudName: segments[0],
    resourceType,
    deliveryType,
    publicId: decodeURIComponent(publicIdSegments.join("/")),
  };
}

function splitCloudinaryPublicId(parsedPublicId: string): { publicId: string; format?: string } {
  const trimmed = parsedPublicId.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return { publicId: trimmed };
  }

  return {
    publicId: trimmed.slice(0, lastDot),
    format: trimmed.slice(lastDot + 1),
  };
}

function buildCloudinarySignedUrl(source: URL, overrideType?: string): string | null {
  const parsed = parseCloudinaryAssetFromUrl(source);
  if (!parsed) return null;

  try {
    assertCloudinaryConfigured();
  } catch {
    return null;
  }

  try {
    return cloudinary.url(parsed.publicId, {
      resource_type: parsed.resourceType,
      type: overrideType || parsed.deliveryType,
      secure: true,
      sign_url: true,
    });
  } catch {
    return null;
  }
}

function buildCloudinaryPrivateDownloadUrl(source: URL, overrideType?: string): string | null {
  const parsed = parseCloudinaryAssetFromUrl(source);
  if (!parsed) return null;

  try {
    assertCloudinaryConfigured();
  } catch {
    return null;
  }

  try {
    const split = splitCloudinaryPublicId(parsed.publicId);
    const downloadUrl = cloudinary.utils.private_download_url(split.publicId, split.format, {
      resource_type: parsed.resourceType,
      type: overrideType || parsed.deliveryType,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 5,
      attachment: false,
    });

    return typeof downloadUrl === "string" ? downloadUrl : null;
  } catch {
    return null;
  }
}

function canFetchInternalCandidate(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" && INTERNAL_FETCH_ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function buildCloudinaryFetchCandidates(source: URL): string[] {
  const candidates: string[] = [source.toString()];

  const rawFallback = buildCloudinaryRawFallbackUrl(source);
  if (rawFallback) {
    candidates.push(rawFallback);
  }

  const signedCurrentType = buildCloudinarySignedUrl(source);
  if (signedCurrentType) {
    candidates.push(signedCurrentType);
  }

  const signedAuthenticated = buildCloudinarySignedUrl(source, "authenticated");
  if (signedAuthenticated) {
    candidates.push(signedAuthenticated);
  }

  const signedPrivate = buildCloudinarySignedUrl(source, "private");
  if (signedPrivate) {
    candidates.push(signedPrivate);
  }

  const privateDownloadCurrentType = buildCloudinaryPrivateDownloadUrl(source);
  if (privateDownloadCurrentType) {
    candidates.push(privateDownloadCurrentType);
  }

  const privateDownloadAuthenticated = buildCloudinaryPrivateDownloadUrl(source, "authenticated");
  if (privateDownloadAuthenticated) {
    candidates.push(privateDownloadAuthenticated);
  }

  const privateDownloadPrivate = buildCloudinaryPrivateDownloadUrl(source, "private");
  if (privateDownloadPrivate) {
    candidates.push(privateDownloadPrivate);
  }

  return [...new Set(candidates)].filter(canFetchInternalCandidate);
}

async function fetchFirstWorkingCandidate(candidates: string[]): Promise<Response | null> {
  for (const candidate of candidates) {
    const response = await fetch(candidate, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    if (response.ok && response.body) {
      return response;
    }
  }

  return null;
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

    const isCloudinarySource = parsed.hostname === "res.cloudinary.com";
    const candidates = isCloudinarySource
      ? buildCloudinaryFetchCandidates(parsed)
      : [parsed.toString()];

    const upstream = await fetchFirstWorkingCandidate(candidates);

    if (!upstream || !upstream.ok || !upstream.body) {
      // Best-effort final probe so the caller gets actionable diagnostics.
      const finalProbe = await fetch(parsed.toString(), {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
      });

      const upstreamStatus = finalProbe.status;
      const upstreamError = finalProbe.headers.get("x-cld-error") || undefined;
      return NextResponse.json(
        {
          error: `Failed to fetch remote file (status ${finalProbe.status})`,
          upstreamStatus,
          upstreamStatusText: finalProbe.statusText,
          upstreamError,
        },
        { status: upstreamStatus === 401 || upstreamStatus === 403 ? upstreamStatus : 502 }
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

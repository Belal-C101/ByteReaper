"use client";

import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

export interface AttachmentData {
  url: string;
  publicId?: string;
  resourceType?: "image" | "video" | "raw";
  format?: string;
  bytes?: number;
  mime?: string;
  originalName?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Document extensions that should never render as <img> even if Cloudinary says resource_type: image */
const DOCUMENT_EXTS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv", "rtf", "odt", "ods", "odp", "zip",
  "gz", "tar", "rar", "7z",
]);

/** Derive the file extension from name, format, or URL — lowercased, no dot */
function getExt(att: AttachmentData): string | undefined {
  if (att.originalName) {
    const dot = att.originalName.lastIndexOf(".");
    if (dot > 0) return att.originalName.slice(dot + 1).toLowerCase();
  }
  if (att.format) return att.format.toLowerCase();
  try {
    const path = new URL(att.url).pathname;
    const dot = path.lastIndexOf(".");
    if (dot > 0) return path.slice(dot + 1).toLowerCase();
  } catch { /* ignore */ }
  return undefined;
}

function isDocument(att: AttachmentData): boolean {
  const ext = getExt(att);
  if (ext && DOCUMENT_EXTS.has(ext)) return true;
  if (att.mime === "application/pdf") return true;
  return false;
}

function isImage(att: AttachmentData): boolean {
  // Documents that Cloudinary classified as "image" (e.g. PDFs) must NOT render as <img>
  if (isDocument(att)) return false;
  if (att.mime?.startsWith("image/")) return true;
  if (att.resourceType === "image") return true;
  return false;
}

function isAudio(att: AttachmentData): boolean {
  if (att.mime?.startsWith("audio/")) return true;
  // Cloudinary stores audio as resource_type: video
  if (att.resourceType === "video" && att.mime?.startsWith("audio/")) return true;
  // Check format for common audio formats
  const audioFormats = ["mp3", "wav", "ogg", "aac", "flac", "webm", "opus", "m4a"];
  if (att.resourceType === "video" && att.format && audioFormats.includes(att.format)) return true;
  return false;
}

function isVideo(att: AttachmentData): boolean {
  if (att.resourceType === "video" && !isAudio(att)) return true;
  if (att.mime?.startsWith("video/")) return true;
  return false;
}

/**
 * Route a Cloudinary URL through our file-proxy so the server can sign it
 * when the account requires authenticated delivery.
 */
function proxyUrl(url: string, name?: string, disposition: "inline" | "attachment" = "inline"): string {
  if (!url.includes("res.cloudinary.com")) return url;
  const params = new URLSearchParams({ url, disposition });
  if (name) params.set("name", name);
  return `/api/file-proxy?${params.toString()}`;
}

/**
 * Fetch via proxy as a blob and trigger a real download.
 * Needed because the `download` attribute is ignored on cross-origin URLs.
 */
async function blobDownload(proxyHref: string, fileName: string) {
  const res = await fetch(proxyHref);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export function Attachment({
  attachment,
  compact = false,
}: {
  attachment: AttachmentData;
  compact?: boolean;
}) {
  const name = attachment.originalName || "file";
  const [downloading, setDownloading] = useState(false);
  // All media/open links go through the proxy so the server can sign URLs
  // when the Cloudinary account requires authenticated delivery.
  const displayUrl = proxyUrl(attachment.url, name, "inline");
  const downloadHref = proxyUrl(attachment.url, name, "attachment");

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloading) return;
    setDownloading(true);
    try {
      await blobDownload(downloadHref, name);
    } catch {
      // Fallback: open in new tab
      window.open(displayUrl, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  };

  if (isImage(attachment)) {
    return (
      <div className="rounded-lg overflow-hidden">
        <img
          src={displayUrl}
          alt={name}
          className="max-w-full rounded-lg max-h-[300px] object-contain"
          loading="lazy"
        />
        {!compact && attachment.bytes && (
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
            {name} ({formatBytes(attachment.bytes)})
          </p>
        )}
      </div>
    );
  }

  if (isAudio(attachment)) {
    return (
      <div className="space-y-1">
        <audio controls src={displayUrl} className="w-full max-w-[300px]" preload="metadata" />
        {!compact && (
          <p className="text-[10px] text-muted-foreground/50">
            {name} {attachment.bytes ? `(${formatBytes(attachment.bytes)})` : ""}
          </p>
        )}
      </div>
    );
  }

  if (isVideo(attachment)) {
    return (
      <div className="space-y-1">
        <video
          controls
          src={displayUrl}
          className="max-w-full rounded-lg max-h-[300px]"
          preload="metadata"
        />
        {!compact && (
          <p className="text-[10px] text-muted-foreground/50">
            {name} {attachment.bytes ? `(${formatBytes(attachment.bytes)})` : ""}
          </p>
        )}
      </div>
    );
  }

  // Raw / PDF / document — show open + download buttons
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30 border border-border/30">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs truncate max-w-[160px]" title={name}>
        {name}
      </span>
      {attachment.bytes && (
        <span className="text-[10px] text-muted-foreground/50 shrink-0">
          ({formatBytes(attachment.bytes)})
        </span>
      )}
      <a
        href={displayUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in new tab"
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <a
        href={downloadHref}
        download={name}
        title="Download"
        onClick={handleDownload}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      </a>
    </div>
  );
}

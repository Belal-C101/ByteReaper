"use client";

import { Download, ExternalLink, FileText } from "lucide-react";
import { toDownloadUrl } from "@/lib/cloudinary-upload";

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

function isImage(att: AttachmentData): boolean {
  if (att.resourceType === "image") return true;
  if (att.mime?.startsWith("image/")) return true;
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

export function Attachment({
  attachment,
  compact = false,
}: {
  attachment: AttachmentData;
  compact?: boolean;
}) {
  const name = attachment.originalName || "file";

  if (isImage(attachment)) {
    return (
      <div className="rounded-lg overflow-hidden">
        <img
          src={attachment.url}
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
        <audio controls src={attachment.url} className="w-full max-w-[300px]" preload="metadata" />
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
          src={attachment.url}
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
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Open in new tab"
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <a
        href={toDownloadUrl(attachment.url, name)}
        download={name}
        title="Download"
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

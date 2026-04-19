import { NextRequest, NextResponse } from "next/server";
import {
  uploadBufferToCloudinary,
  assertCloudinaryConfigured,
  type CloudinaryResourceType,
} from "@/lib/cloudinary/server";
import { uploadBufferToTmpfiles } from "@/lib/uploads/tmpfiles";
import { verifyFirebaseIdTokenDetailed } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB per-file cap

type UploadedEntry = {
  url: string;
  name: string;
  provider: "cloudinary" | "tmpfiles";
  type: "image" | "file";
  publicId?: string;
  bytes?: number;
  format?: string;
};

type UploadError = { name: string; reason: string };

function isImageFile(f: { type?: string; name: string }): boolean {
  if (f.type?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|heic)$/i.test(f.name);
}

function pickResourceType(f: { type?: string; name: string }): CloudinaryResourceType {
  return isImageFile(f) ? "image" : "raw";
}

async function uploadOneFile(
  file: File,
  folder: string
): Promise<{ ok: true; entry: UploadedEntry } | { ok: false; err: UploadError }> {
  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (e) {
    return {
      ok: false,
      err: { name: file.name, reason: `Failed to read buffer: ${(e as Error).message}` },
    };
  }

  const resourceType = pickResourceType(file);
  const isImg = isImageFile(file);
  const safeBase = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 80);
  const publicId = `${Date.now()}-${safeBase}`;

  // 1) Cloudinary
  try {
    assertCloudinaryConfigured();
    const result = await uploadBufferToCloudinary(buffer, {
      folder,
      public_id: publicId,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
    });
    console.info(
      `[Upload] Cloudinary OK ${file.name} → ${result.secure_url} (rt=${resourceType})`
    );
    return {
      ok: true,
      entry: {
        url: result.secure_url,
        name: file.name,
        provider: "cloudinary",
        type: isImg ? "image" : "file",
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
      },
    };
  } catch (cloudErr) {
    console.warn(
      `[Upload] Cloudinary FAILED ${file.name}:`,
      (cloudErr as Error).message
    );
  }

  // 2) tmpfiles fallback
  try {
    const tmp = await uploadBufferToTmpfiles(buffer, file.name, file.type);
    console.info(`[Upload] tmpfiles OK ${file.name} → ${tmp.downloadUrl}`);
    return {
      ok: true,
      entry: {
        url: tmp.downloadUrl,
        name: file.name,
        provider: "tmpfiles",
        type: isImg ? "image" : "file",
        bytes: buffer.byteLength,
      },
    };
  } catch (tmpErr) {
    const reason = `Cloudinary failed and tmpfiles failed: ${(tmpErr as Error).message}`;
    console.error(`[Upload] BOTH failed ${file.name}:`, reason);
    return { ok: false, err: { name: file.name, reason } };
  }
}

function splitResults(entries: UploadedEntry[]): {
  images: Array<{ url: string; name: string; provider: string; label: string }>;
  files: Array<{ url: string; name: string; provider: string; label: string }>;
} {
  const images = entries
    .filter((e) => e.type === "image")
    .map((e, i) => ({
      url: e.url,
      name: e.name,
      provider: e.provider,
      label: `image${i + 1}`,
    }));
  const files = entries
    .filter((e) => e.type === "file")
    .map((e, i) => ({
      url: e.url,
      name: e.name,
      provider: e.provider,
      label: `file${i + 1}`,
    }));
  return { images, files };
}

export async function POST(req: NextRequest) {
  try {
    // Auth
    const authHeader = req.headers.get("authorization") || "";
    const verifyResult = await verifyFirebaseIdTokenDetailed(authHeader.replace(/^Bearer\s+/i, ""));
    if (!verifyResult.ok || !verifyResult.decoded) {
      return NextResponse.json(
        { error: `Token verification failed: ${verifyResult.error || "unknown"}` },
        { status: 401 }
      );
    }
    const user = verifyResult.decoded;

    // Parse multipart
    const formData = await req.formData();
    const context = (formData.get("context") as string) || "general";
    const folder = `bytereaper/${context}/${user.uid}`;

    // Collect files — support both "file" (singular) and "files" (plural)
    const raw: File[] = [];
    const single = formData.get("file");
    if (single instanceof File) raw.push(single);
    const multi = formData.getAll("files").filter((f): f is File => f instanceof File);
    raw.push(...multi);

    if (raw.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Size check
    for (const f of raw) {
      if (f.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `File "${f.name}" exceeds 25MB limit` },
          { status: 413 }
        );
      }
    }

    // Upload each file independently
    const entries: UploadedEntry[] = [];
    const errors: UploadError[] = [];
    for (const f of raw) {
      const r = await uploadOneFile(f, folder);
      if (r.ok) entries.push(r.entry);
      else errors.push(r.err);
    }

    // If literally nothing worked, return 502
    if (entries.length === 0) {
      return NextResponse.json(
        { success: false, errors, message: "All uploads failed" },
        { status: 502 }
      );
    }

    // Legacy single-file path: if caller sent `file` (singular) and only one file
    if (single instanceof File && raw.length === 1 && entries.length === 1) {
      const e = entries[0];
      return NextResponse.json({
        url: e.url,
        publicId: e.publicId,
        resourceType: e.type === "image" ? "image" : "raw",
        bytes: e.bytes,
        format: e.format,
        originalName: e.name,
        provider: e.provider,
        success: true,
        images:
          e.type === "image"
            ? [{ url: e.url, name: e.name, provider: e.provider, label: "image1" }]
            : [],
        files:
          e.type === "file"
            ? [{ url: e.url, name: e.name, provider: e.provider, label: "file1" }]
            : [],
        totalUploaded: 1,
        errors,
      });
    }

    const { images, files } = splitResults(entries);
    return NextResponse.json({
      success: true,
      images,
      files,
      totalUploaded: entries.length,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[api/upload] fatal:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

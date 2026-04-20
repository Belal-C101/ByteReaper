// Direct unsigned upload to Cloudinary — bypasses Netlify function limits (6MB / 10s)
// Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
// The preset MUST be configured as "Unsigned" in Cloudinary dashboard.

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
  originalFilename: string;
}

const DEBUG_CLOUDINARY_UPLOAD =
  process.env.NEXT_PUBLIC_BYTEREAPER_DEBUG === "1" || process.env.NODE_ENV !== "production";

function cloudinaryUploadDebugLog(message: string, payload?: unknown) {
  if (!DEBUG_CLOUDINARY_UPLOAD) return;
  if (typeof payload === "undefined") {
    console.log("[ByteReaper]", message);
    return;
  }
  console.log("[ByteReaper]", message, payload);
}

export async function uploadToCloudinary(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  cloudinaryUploadDebugLog("uploadToCloudinary:start", {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    cloudinaryUploadDebugLog("uploadToCloudinary:missing-env", {
      hasCloudName: Boolean(cloudName),
      hasUploadPreset: Boolean(uploadPreset),
    });
    throw new Error(
      "Cloudinary env vars missing (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET)."
    );
  }

  // Always use /auto/upload so PDFs, audio, video, images all work correctly.
  // Cloudinary determines the correct resource_type automatically.
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  // Optional: folder per environment.
  formData.append("folder", "bytereaper/uploads");

  // Use XHR (not fetch) so we can track progress.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
        cloudinaryUploadDebugLog("uploadToCloudinary:progress", { pct });
      }
    };

    xhr.onload = () => {
      cloudinaryUploadDebugLog("uploadToCloudinary:xhr-onload", { status: xhr.status });
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const r = JSON.parse(xhr.responseText) as {
            url: string;
            secure_url: string;
            public_id: string;
            resource_type: string;
            format: string;
            bytes: number;
            original_filename: string;
          };

          resolve({
            url: r.url,
            secureUrl: r.secure_url,
            publicId: r.public_id,
            resourceType: r.resource_type,
            format: r.format,
            bytes: r.bytes,
            originalFilename: r.original_filename,
          });
          cloudinaryUploadDebugLog("uploadToCloudinary:end", {
            publicId: r.public_id,
            resourceType: r.resource_type,
          });
        } catch {
          cloudinaryUploadDebugLog("uploadToCloudinary:invalid-response");
          reject(new Error("Invalid Cloudinary response."));
        }
      } else {
        cloudinaryUploadDebugLog("uploadToCloudinary:failed", {
          status: xhr.status,
          responseText: xhr.responseText,
        });
        reject(new Error(`Cloudinary upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      cloudinaryUploadDebugLog("uploadToCloudinary:network-error");
      reject(new Error("Network error uploading to Cloudinary."));
    };
    xhr.ontimeout = () => {
      cloudinaryUploadDebugLog("uploadToCloudinary:timeout");
      reject(new Error("Upload timed out."));
    };
    xhr.timeout = 120000; // 2 minutes, direct to Cloudinary

    xhr.send(formData);
  });
}

/** Build a forced-download URL by injecting fl_attachment after /upload/ */
export function toDownloadUrl(secureUrl: string, filename?: string): string {
  const marker = "/upload/";
  const i = secureUrl.indexOf(marker);
  if (i === -1) return secureUrl;
  const flag = filename
    ? `fl_attachment:${encodeURIComponent(filename.replace(/\.[^.]+$/, ""))}`
    : "fl_attachment";
  return (
    secureUrl.slice(0, i + marker.length) +
    flag +
    "/" +
    secureUrl.slice(i + marker.length)
  );
}

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

export async function uploadToCloudinary(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Cloudinary env vars missing (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET)."
    );
  }

  // Use resource_type=auto so images, videos, PDFs, and raw source files all work.
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
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
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
        } catch {
          reject(new Error("Invalid Cloudinary response."));
        }
      } else {
        reject(new Error(`Cloudinary upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error uploading to Cloudinary."));
    xhr.ontimeout = () => reject(new Error("Upload timed out."));
    xhr.timeout = 120000; // 2 minutes, direct to Cloudinary

    xhr.send(formData);
  });
}

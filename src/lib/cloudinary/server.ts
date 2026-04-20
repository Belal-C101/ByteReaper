import "server-only";
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  // Do NOT throw at import time in prod — fail loudly only when used.
  console.warn("[cloudinary] Missing env vars. Uploads will fail until set.");
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export class CloudinaryConfigError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "CloudinaryConfigError";
  }
}

export function assertCloudinaryConfigured() {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new CloudinaryConfigError(
      "Cloudinary not configured: missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET"
    );
  }
}

export type CloudinaryResourceType = "image" | "raw" | "video" | "auto";

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadApiOptions & { resource_type: CloudinaryResourceType }
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "bytereaper",
        ...options,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

export { cloudinary };

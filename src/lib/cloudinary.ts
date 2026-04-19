import 'server-only';

// ─── Types ─────────────────────────────────────────────────

export interface UploadResult {
  url: string;
  publicId: string;
  provider: 'cloudinary';
  type: 'image' | 'file';
  name: string;
}

// ─── Cloudinary-only upload (Imgur + tmpfiles removed) ─────

import { uploadBufferToCloudinary } from '@/lib/cloudinary/server';

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  const isImage = mimeType.startsWith('image/');

  const result = await uploadBufferToCloudinary(fileBuffer, {
    folder: `bytereaper`,
    use_filename: true,
    unique_filename: true,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    provider: 'cloudinary',
    type: isImage ? 'image' : 'file',
    name: fileName,
  };
}

export async function uploadMultipleFiles(
  files: Array<{ buffer: Buffer; name: string; mimeType: string }>
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    try {
      const result = await uploadFile(file.buffer, file.name, file.mimeType);
      results.push(result);
    } catch (error) {
      console.error(`[Upload] Failed to upload ${file.name}:`, error);
    }
  }

  return results;
}

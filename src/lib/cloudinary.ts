import 'server-only';

// ─── Types ─────────────────────────────────────────────────

export interface UploadResult {
  url: string;
  publicId: string;
  provider: 'cloudinary' | 'imgur' | 'tmpfiles';
  type: 'image' | 'file';
  name: string;
}

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  bytes: number;
  created_at: string;
}

interface CloudinaryUsageResponse {
  credits: { used_percent: number; usage: number; limit: number };
  storage: { usage: number; limit: number };
}

interface CloudinaryResourcesResponse {
  resources: Array<{
    public_id: string;
    created_at: string;
    resource_type: string;
    bytes: number;
  }>;
  next_cursor?: string;
}

// ─── Config ────────────────────────────────────────────────

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

function getAuthHeader(apiKey: string, apiSecret: string): string {
  return 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
}

// ─── Auto-Delete (Cloudinary Admin API) ────────────────────

async function checkAndCleanupStorage(): Promise<void> {
  const config = getCloudinaryConfig();
  if (!config) return;

  try {
    // Check usage via Admin API
    const usageRes = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/usage`,
      {
        headers: { Authorization: getAuthHeader(config.apiKey, config.apiSecret) },
      }
    );

    if (!usageRes.ok) {
      console.warn('[Cloudinary] Could not check usage:', usageRes.status);
      return;
    }

    const usage: CloudinaryUsageResponse = await usageRes.json();
    const usedPercent = usage.credits?.used_percent ?? 0;

    console.log(`[Cloudinary] Credit usage: ${usedPercent.toFixed(1)}%`);

    // If usage is > 80%, delete oldest resources
    if (usedPercent > 80) {
      console.log('[Cloudinary] Approaching limit, cleaning up oldest resources...');
      await deleteOldestResources(config, 10);
    }
  } catch (error) {
    console.error('[Cloudinary] Cleanup check error:', error);
  }
}

async function deleteOldestResources(
  config: { cloudName: string; apiKey: string; apiSecret: string },
  count: number
): Promise<void> {
  try {
    // List oldest resources
    const listRes = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image?max_results=${count}&direction=1`,
      {
        headers: { Authorization: getAuthHeader(config.apiKey, config.apiSecret) },
      }
    );

    if (!listRes.ok) return;

    const data: CloudinaryResourcesResponse = await listRes.json();

    for (const resource of data.resources) {
      try {
        await fetch(
          `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload/${resource.public_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: getAuthHeader(config.apiKey, config.apiSecret) },
          }
        );
        console.log(`[Cloudinary] Deleted old resource: ${resource.public_id}`);
      } catch (deleteErr) {
        console.error(`[Cloudinary] Failed to delete ${resource.public_id}:`, deleteErr);
      }
    }

    // Also cleanup raw/video files
    const rawListRes = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/raw?max_results=${count}&direction=1`,
      {
        headers: { Authorization: getAuthHeader(config.apiKey, config.apiSecret) },
      }
    );

    if (rawListRes.ok) {
      const rawData: CloudinaryResourcesResponse = await rawListRes.json();
      for (const resource of rawData.resources) {
        try {
          await fetch(
            `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/raw/upload/${resource.public_id}`,
            {
              method: 'DELETE',
              headers: { Authorization: getAuthHeader(config.apiKey, config.apiSecret) },
            }
          );
          console.log(`[Cloudinary] Deleted old raw resource: ${resource.public_id}`);
        } catch (deleteErr) {
          console.error(`[Cloudinary] Failed to delete ${resource.public_id}:`, deleteErr);
        }
      }
    }
  } catch (error) {
    console.error('[Cloudinary] Delete oldest resources error:', error);
  }
}

// ─── Cloudinary Upload ─────────────────────────────────────

async function uploadToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult | null> {
  const config = getCloudinaryConfig();
  if (!config) return null;

  // Auto-cleanup before upload
  await checkAndCleanupStorage();

  const isImage = mimeType.startsWith('image/');
  const resourceType = isImage ? 'image' : 'raw';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = 'bytereaper-chat';

  // Build signature string
  const signatureString = `folder=${folder}&timestamp=${timestamp}${config.apiSecret}`;
  const crypto = await import('crypto');
  const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

  const formData = new FormData();
  const blob = new Blob([fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer], { type: mimeType });
  formData.append('file', blob, fileName);
  formData.append('api_key', config.apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', folder);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
      { method: 'POST', body: formData }
    );

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('[Cloudinary] Upload failed:', res.status, errorBody);
      return null;
    }

    const data: CloudinaryUploadResponse = await res.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
      provider: 'cloudinary',
      type: isImage ? 'image' : 'file',
      name: fileName,
    };
  } catch (error) {
    console.error('[Cloudinary] Upload error:', error);
    return null;
  }
}

// ─── Imgur Fallback (Images Only) ──────────────────────────

async function uploadToImgur(fileBuffer: Buffer, fileName: string): Promise<UploadResult | null> {
  try {
    const base64 = fileBuffer.toString('base64');

    const res = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        // Anonymous uploads — no client ID needed for basic uploads
        // But having one increases rate limit from 12.5/hr to 50/hr
        Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID || '546c25a59c58ad7'}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64,
        type: 'base64',
        name: fileName,
      }),
    });

    if (!res.ok) {
      console.error('[Imgur] Upload failed:', res.status);
      return null;
    }

    const data = await res.json();
    if (!data.data?.link) return null;

    return {
      url: data.data.link,
      publicId: data.data.id || '',
      provider: 'imgur',
      type: 'image',
      name: fileName,
    };
  } catch (error) {
    console.error('[Imgur] Upload error:', error);
    return null;
  }
}

// ─── Tmpfiles.org Fallback (Any File) ──────────────────────

async function uploadToTmpfiles(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<UploadResult | null> {
  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer], { type: mimeType });
    formData.append('file', blob, fileName);

    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.error('[tmpfiles] Upload failed:', res.status);
      return null;
    }

    const data = await res.json();
    if (!data.data?.url) return null;

    // Convert tmpfiles URL to a direct download link by inserting 'dl/'
    const directUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    const keyMatch = data.data.url.match(/tmpfiles\.org\/([^/]+)/);
    const keyId = keyMatch ? keyMatch[1] : '';

    const isImage = mimeType.startsWith('image/');
    return {
      url: directUrl,
      publicId: keyId,
      provider: 'tmpfiles',
      type: isImage ? 'image' : 'file',
      name: fileName,
    };
  } catch (error) {
    console.error('[tmpfiles] Upload error:', error);
    return null;
  }
}

// ─── Main Upload Function (with Failover) ──────────────────

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  const isImage = mimeType.startsWith('image/');

  if (isImage) {
    // 1. For images, try Imgur FIRST (per user request)
    const imgurResult = await uploadToImgur(fileBuffer, fileName);
    if (imgurResult) return imgurResult;

    console.log(`[Upload] Imgur failed for ${fileName}, trying Cloudinary...`);

    // 2. Fallback to Cloudinary for images
    const cloudinaryResult = await uploadToCloudinary(fileBuffer, fileName, mimeType);
    if (cloudinaryResult) return cloudinaryResult;

    console.log(`[Upload] Cloudinary also failed for ${fileName}, trying tmpfiles...`);
  } else {
    // 1. For non-images (files), try Cloudinary FIRST
    const cloudinaryResult = await uploadToCloudinary(fileBuffer, fileName, mimeType);
    if (cloudinaryResult) return cloudinaryResult;

    console.log(`[Upload] Cloudinary failed for file ${fileName}, trying tmpfiles...`);
  }

  // Final fallback: tmpfiles.org handles anything if the preferred hosts fail
  const tmpfilesResult = await uploadToTmpfiles(fileBuffer, fileName, mimeType);
  if (tmpfilesResult) return tmpfilesResult;

  // If everything fails, throw
  throw new Error(`Failed to upload ${fileName} — all providers failed. Check your API credentials.`);
}

// ─── Batch Upload ──────────────────────────────────────────

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
      // Continue with other files even if one fails
    }
  }

  return results;
}

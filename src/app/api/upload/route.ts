import { NextRequest, NextResponse } from 'next/server';
import { uploadMultipleFiles, UploadResult } from '@/lib/cloudinary';

export const maxDuration = 30;

// Max 10MB per file
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate and prepare files
    const filesToUpload: Array<{ buffer: Buffer; name: string; mimeType: string }> = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10MB limit` },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      filesToUpload.push({
        buffer: Buffer.from(arrayBuffer),
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
      });
    }

    // Upload all files
    const results = await uploadMultipleFiles(filesToUpload);

    // Separate into images and files
    const images = results
      .filter((r) => r.type === 'image')
      .map((r, i) => ({
        url: r.url,
        name: r.name,
        provider: r.provider,
        label: `image${i + 1}`,
      }));

    const uploadedFiles = results
      .filter((r) => r.type === 'file')
      .map((r, i) => ({
        url: r.url,
        name: r.name,
        provider: r.provider,
        label: `file${i + 1}`,
      }));

    return NextResponse.json({
      success: true,
      images,
      files: uploadedFiles,
      totalUploaded: results.length,
    });
  } catch (error) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

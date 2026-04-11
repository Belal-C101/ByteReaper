import { NextRequest, NextResponse } from 'next/server';
import { uploadMultipleFiles, UploadResult } from '@/lib/cloudinary';

export const maxDuration = 30;

// Max 10MB per file
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const EXTENSION_MIME_MAP: Record<string, string> = {
  md: 'text/markdown',
  markdown: 'text/markdown',
  txt: 'text/plain',
  csv: 'text/csv',
  xml: 'application/xml',
  ini: 'text/plain',
  log: 'text/plain',
  json: 'application/json',
  js: 'text/javascript',
  jsx: 'text/javascript',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  py: 'text/x-python',
  java: 'text/x-java-source',
  c: 'text/x-c',
  cpp: 'text/x-c++src',
  h: 'text/x-c',
  css: 'text/css',
  html: 'text/html',
  yml: 'application/x-yaml',
  yaml: 'application/x-yaml',
  sql: 'application/sql',
  sh: 'application/x-sh',
  bash: 'application/x-sh',
  go: 'text/x-go',
  rs: 'text/rust',
  rb: 'text/x-ruby',
  php: 'application/x-httpd-php',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
};

function normalizeMimeType(file: File): string {
  if (typeof file.type === 'string' && file.type.trim().length > 0) {
    return file.type;
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return EXTENSION_MIME_MAP[ext] || 'application/octet-stream';
}

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
        mimeType: normalizeMimeType(file),
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

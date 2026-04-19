import "server-only";

export interface TmpfilesResult {
  url: string; // public share URL
  downloadUrl: string; // direct download URL (used for fileLinks storage)
  name: string;
}

const TMPFILES_MAX_BYTES = 60 * 1024 * 1024;

export async function uploadBufferToTmpfiles(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<TmpfilesResult> {
  if (buffer.byteLength > TMPFILES_MAX_BYTES) {
    throw new Error(
      `tmpfiles limit exceeded (file ${fileName} is ${buffer.byteLength} bytes, max 60MB)`
    );
  }

  const form = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: mimeType || "application/octet-stream",
  });
  form.append("file", blob, fileName);

  const res = await fetch("https://tmpfiles.org/api/v1/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(
      `tmpfiles upload failed: HTTP ${res.status} ${res.statusText}`
    );
  }

  const json = (await res.json()) as {
    status: string;
    data?: { url?: string };
  };
  const shareUrl = json?.data?.url;
  if (!shareUrl || typeof shareUrl !== "string") {
    throw new Error(
      `tmpfiles returned unexpected payload: ${JSON.stringify(json)}`
    );
  }

  // Convert "https://tmpfiles.org/12345/file.pdf" -> "https://tmpfiles.org/dl/12345/file.pdf"
  const downloadUrl = shareUrl.replace(
    /^https:\/\/tmpfiles\.org\/(?!dl\/)/,
    "https://tmpfiles.org/dl/"
  );

  return { url: shareUrl, downloadUrl, name: fileName };
}

import { auth } from "@/lib/firebase";

export async function uploadFile(
  file: File,
  context: "chat" | "analyze" | "general" | "private-chat" = "general"
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const idToken = await user.getIdToken();

  const fd = new FormData();
  fd.append("file", file);
  fd.append("context", context);

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: fd,
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error);
  }

  return res.json() as Promise<{
    url: string;
    publicId: string;
    resourceType: "image" | "video" | "raw";
    bytes: number;
    width?: number;
    height?: number;
    format?: string;
    originalName: string;
  }>;
}

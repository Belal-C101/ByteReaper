import { auth } from "@/lib/firebase";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";

export async function uploadFile(
  file: File,
  _context: "chat" | "analyze" | "general" | "private-chat" = "general",
  onProgress?: (pct: number) => void
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const uploaded = await uploadToCloudinary(file, onProgress);

  return {
    url: uploaded.secureUrl || uploaded.url,
    publicId: uploaded.publicId,
    resourceType: (uploaded.resourceType === "video"
      ? "video"
      : uploaded.resourceType === "image"
        ? "image"
        : "raw") as "image" | "video" | "raw",
    bytes: uploaded.bytes,
    format: uploaded.format,
    originalName: uploaded.originalFilename || file.name,
  } satisfies {
    url: string;
    publicId: string;
    resourceType: "image" | "video" | "raw";
    bytes: number;
    width?: number;
    height?: number;
    format?: string;
    originalName: string;
  };
}

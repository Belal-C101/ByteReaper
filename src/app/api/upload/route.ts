import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToCloudinary } from "@/lib/cloudinary/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const user = await verifyFirebaseIdToken(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Parse multipart — supports both single "file" and multi "files" field names
    const formData = await req.formData();
    let file = formData.get("file") as File | null;
    const context = (formData.get("context") as string) || "general";

    // Backwards-compat: the old route used "files" (plural)
    if (!file) {
      const files = formData.getAll("files") as File[];
      if (files.length > 0) {
        // Multi-file upload — upload all and return legacy format
        const results = [];
        for (const f of files) {
          if (f.size > MAX_SIZE) {
            return NextResponse.json({ error: `File "${f.name}" exceeds 25MB limit` }, { status: 413 });
          }
          const buffer = Buffer.from(await f.arrayBuffer());
          const result = await uploadBufferToCloudinary(buffer, {
            folder: `bytereaper/${context}/${user.uid}`,
            public_id: `${Date.now()}-${f.name.replace(/\.[^.]+$/, "")}`.slice(0, 100),
            use_filename: true,
            unique_filename: true,
          });
          const isImage = f.type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(f.name);
          results.push({
            url: result.secure_url,
            name: f.name,
            provider: "cloudinary" as const,
            type: isImage ? "image" : "file",
            publicId: result.public_id,
          });
        }

        const images = results
          .filter((r) => r.type === "image")
          .map((r, i) => ({ url: r.url, name: r.name, provider: r.provider, label: `image${i + 1}` }));
        const uploadedFiles = results
          .filter((r) => r.type === "file")
          .map((r, i) => ({ url: r.url, name: r.name, provider: r.provider, label: `file${i + 1}` }));

        return NextResponse.json({
          success: true,
          images,
          files: uploadedFiles,
          totalUploaded: results.length,
        });
      }
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 3. Upload to Cloudinary only
    const result = await uploadBufferToCloudinary(buffer, {
      folder: `bytereaper/${context}/${user.uid}`,
      public_id: `${Date.now()}-${file.name.replace(/\.[^.]+$/, "")}`.slice(0, 100),
      use_filename: true,
      unique_filename: true,
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      format: result.format,
      originalName: file.name,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[api/upload] error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

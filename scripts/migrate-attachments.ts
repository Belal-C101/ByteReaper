/**
 * migrate-attachments.ts
 *
 * One-off script to scan Firestore messages and normalize legacy Cloudinary URLs.
 * Detects:
 *   - URLs pointing to api.cloudinary.com (upload endpoint, not delivery)
 *   - Messages with attachments missing resource_type
 *
 * Run with: npx tsx scripts/migrate-attachments.ts
 *
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY,
 * and CLOUDINARY_CLOUD_NAME in your .env or environment.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

interface AttachmentData {
  url?: string;
  publicId?: string;
  resourceType?: string;
  bytes?: number;
  mime?: string;
  originalName?: string;
}

interface MessageDoc {
  attachment?: AttachmentData;
  type?: string;
}

async function migrateConversationMessages() {
  console.log("Scanning conversations...");
  const convSnap = await db.collection("conversations").get();
  let fixedCount = 0;
  const unfixable: string[] = [];

  for (const convDoc of convSnap.docs) {
    const messagesSnap = await db
      .collection("conversations")
      .doc(convDoc.id)
      .collection("messages")
      .get();

    for (const msgDoc of messagesSnap.docs) {
      const data = msgDoc.data() as MessageDoc;
      if (!data.attachment?.url) continue;

      const url = data.attachment.url;
      let needsUpdate = false;
      const updates: Record<string, unknown> = {};

      // Fix api.cloudinary.com URLs → replace with res.cloudinary.com
      if (url.includes("api.cloudinary.com")) {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        if (cloudName && data.attachment.publicId) {
          const rt = data.attachment.resourceType || "raw";
          const newUrl = `https://res.cloudinary.com/${cloudName}/${rt}/upload/${data.attachment.publicId}`;
          updates["attachment.url"] = newUrl;
          needsUpdate = true;
          console.log(`  FIX: ${convDoc.id}/${msgDoc.id} api→res URL`);
        } else {
          unfixable.push(`${convDoc.id}/${msgDoc.id}: api.cloudinary.com URL, no publicId/cloudName`);
        }
      }

      // Fix missing resource_type
      if (!data.attachment.resourceType) {
        // Infer from mime or format
        const mime = data.attachment.mime || "";
        if (mime.startsWith("image/")) {
          updates["attachment.resourceType"] = "image";
        } else if (mime.startsWith("video/") || mime.startsWith("audio/")) {
          updates["attachment.resourceType"] = "video";
        } else {
          updates["attachment.resourceType"] = "raw";
        }
        needsUpdate = true;
        console.log(`  FIX: ${convDoc.id}/${msgDoc.id} missing resourceType → ${updates["attachment.resourceType"]}`);
      }

      if (needsUpdate) {
        await db
          .collection("conversations")
          .doc(convDoc.id)
          .collection("messages")
          .doc(msgDoc.id)
          .update(updates);
        fixedCount++;
      }
    }
  }

  console.log(`\nFixed ${fixedCount} messages.`);
  if (unfixable.length > 0) {
    console.log(`\nUnfixable (${unfixable.length}):`);
    unfixable.forEach((u) => console.log(`  - ${u}`));
  }
}

migrateConversationMessages()
  .then(() => {
    console.log("\nMigration complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

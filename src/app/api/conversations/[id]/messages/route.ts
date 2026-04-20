import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST — send a message in a conversation
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: conversationId } = await params;
  const authHeader = req.headers.get("authorization") || "";
  const user = await verifyFirebaseIdToken(authHeader.replace(/^Bearer\s+/i, ""));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify user is a participant
  const convRef = adminDb.collection("conversations").doc(conversationId);
  const convDoc = await convRef.get();
  if (!convDoc.exists) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  const conv = convDoc.data()!;
  if (!conv.participants.includes(user.uid)) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.ciphertext || !body?.iv || !body?.type) {
    return NextResponse.json(
      { error: "ciphertext, iv, and type are required" },
      { status: 400 }
    );
  }

  const validTypes = ["text", "image", "file", "voice", "ai", "system"];
  if (!validTypes.includes(body.type)) {
    return NextResponse.json({ error: "Invalid message type" }, { status: 400 });
  }

  try {
    // Build message document
    const messageData: Record<string, unknown> = {
      senderId: user.uid,
      createdAt: FieldValue.serverTimestamp(),
      type: body.type,
      ciphertext: body.ciphertext,
      iv: body.iv,
      readBy: [user.uid],
    };

    if (body.attachment) {
      messageData.attachment = {
        url: body.attachment.url,
        publicId: body.attachment.publicId || "",
        resourceType: body.attachment.resourceType || "raw",
        bytes: body.attachment.bytes || 0,
        mime: body.attachment.mime || "",
        originalName: body.attachment.originalName || "",
      };
    }

    if (body.aiMention) {
      messageData.aiMention = {
        triggeredBy: user.uid,
        model: body.aiMention.model || "",
        status: "pending",
      };
    }

    // Add message
    const msgRef = await convRef.collection("messages").add(messageData);

    // Update conversation metadata
    const peerUid = conv.participants.find((p: string) => p !== user.uid);
    const updateData: Record<string, unknown> = {
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessagePreview: body.type === "text" ? "[encrypted]" : `[${body.type}]`,
    };

    if (peerUid && body.type !== "system") {
      updateData[`unread.${peerUid}`] = FieldValue.increment(1);
    }

    await convRef.update(updateData);

    return NextResponse.json({ id: msgRef.id });
  } catch (err) {
    console.error("[api/conversations/[id]/messages] POST error", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

// GET — fetch messages (for initial load / pagination)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: conversationId } = await params;
  const authHeader = req.headers.get("authorization") || "";
  const user = await verifyFirebaseIdToken(authHeader.replace(/^Bearer\s+/i, ""));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify user is a participant
  const convDoc = await adminDb.collection("conversations").doc(conversationId).get();
  if (!convDoc.exists) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  if (!convDoc.data()!.participants.includes(user.uid)) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 100);
  const before = req.nextUrl.searchParams.get("before"); // cursor: message ID

  try {
    let query = adminDb
      .collection("conversations")
      .doc(conversationId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (before) {
      const cursorDoc = await adminDb
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .doc(before)
        .get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Mark messages as read by this user
    const batch = adminDb.batch();
    let readCount = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.readBy?.includes(user.uid)) {
        batch.update(doc.ref, { readBy: FieldValue.arrayUnion(user.uid) });
        readCount++;
      }
    }
    if (readCount > 0) {
      // Also reset unread counter
      batch.update(adminDb.collection("conversations").doc(conversationId), {
        [`unread.${user.uid}`]: 0,
      });
      await batch.commit();
    }

    return NextResponse.json({ messages: messages.reverse() });
  } catch (err) {
    console.error("[api/conversations/[id]/messages] GET error", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

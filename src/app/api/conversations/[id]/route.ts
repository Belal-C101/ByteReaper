import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE — delete a conversation and all its messages for both participants
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: conversationId } = await params;
  const authHeader = req.headers.get("authorization") || "";
  const user = await verifyFirebaseIdToken(authHeader.replace(/^Bearer\s+/i, ""));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const convRef = adminDb.collection("conversations").doc(conversationId);
  const convDoc = await convRef.get();
  if (!convDoc.exists) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const conv = convDoc.data()!;
  if (!conv.participants.includes(user.uid)) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  try {
    // Delete all messages in batches
    const messagesRef = convRef.collection("messages");
    let batch = adminDb.batch();
    let count = 0;

    const allMessages = await messagesRef.listDocuments();
    for (const msgDoc of allMessages) {
      batch.delete(msgDoc);
      count++;
      if (count % 400 === 0) {
        await batch.commit();
        batch = adminDb.batch();
      }
    }

    // Delete the conversation doc itself
    batch.delete(convRef);
    await batch.commit();

    return NextResponse.json({ deleted: true, messagesDeleted: count });
  } catch (err) {
    console.error("[api/conversations/[id]] DELETE error", err);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}

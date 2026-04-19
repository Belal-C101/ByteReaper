import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { chatCompletion } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/chat/mention
 * Handle @ByteReaper AI mentions in private chats.
 * Body: { conversationId, messageId, prompt, model? }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const user = await verifyFirebaseIdToken(authHeader.replace(/^Bearer\s+/i, ""));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.conversationId || !body?.prompt) {
    return NextResponse.json(
      { error: "conversationId and prompt required" },
      { status: 400 }
    );
  }

  const { conversationId, messageId, prompt, model } = body;

  // Verify user is a participant
  const convDoc = await adminDb.collection("conversations").doc(conversationId).get();
  if (!convDoc.exists) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  if (!convDoc.data()!.participants.includes(user.uid)) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  try {
    // If a triggering messageId was provided, update its aiMention status
    if (messageId) {
      await adminDb
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .doc(messageId)
        .update({ "aiMention.status": "done" });
    }

    // Get AI response (plaintext — the client will encrypt it before storing)
    const systemPrompt = `You are ByteReaper, an AI assistant embedded in a private chat. The user mentioned you with @ByteReaper. Be concise, helpful, and direct. If asked about the conversation, note that you cannot read encrypted messages — you only see the prompt directed at you.`;

    const response = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      model
    );

    return NextResponse.json({
      reply: response,
      model: model || "default",
    });
  } catch (err) {
    console.error("[api/chat/mention] error", err);

    // Update status to error if we have a messageId
    if (messageId) {
      try {
        await adminDb
          .collection("conversations")
          .doc(conversationId)
          .collection("messages")
          .doc(messageId)
          .update({
            "aiMention.status": "error",
            "aiMention.errorMessage": err instanceof Error ? err.message : "Unknown error",
          });
      } catch {
        /* ignore secondary error */
      }
    }

    return NextResponse.json({ error: "AI mention failed" }, { status: 500 });
  }
}

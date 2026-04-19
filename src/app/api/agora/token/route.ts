import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken, adminDb } from "@/lib/firebase/admin";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/agora/token
 * Generate an Agora RTC token for voice calls.
 * Body: { channelName, conversationId }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const user = await verifyFirebaseIdToken(authHeader.replace(/^Bearer\s+/i, ""));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appId = process.env.AGORA_APP_ID;
  const appCert = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCert) {
    return NextResponse.json(
      { error: "Agora not configured" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.channelName || !body?.conversationId) {
    return NextResponse.json(
      { error: "channelName and conversationId required" },
      { status: 400 }
    );
  }

  const { channelName, conversationId } = body;

  // Verify user is a participant in the conversation
  const convDoc = await adminDb.collection("conversations").doc(conversationId).get();
  if (!convDoc.exists) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  if (!convDoc.data()!.participants.includes(user.uid)) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Generate a UID hash for Agora (numeric, max 32 bits)
  const agoraUid = Math.abs(hashCode(user.uid)) % 0xffffffff;

  // Token expires in 1 hour
  const expirationTime = Math.floor(Date.now() / 1000) + 3600;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCert,
    channelName,
    agoraUid,
    RtcRole.PUBLISHER,
    expirationTime
  );

  return NextResponse.json({
    token,
    uid: agoraUid,
    channelName,
    appId,
  });
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit int
  }
  return hash;
}

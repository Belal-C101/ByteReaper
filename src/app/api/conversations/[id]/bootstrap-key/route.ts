import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken, adminDb } from "@/lib/firebase/admin";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: conversationId } = await params;
  const authHeader = req.headers.get("authorization") || "";
  const user = await verifyFirebaseIdToken(authHeader.replace(/^Bearer\s+/i, ""));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const convRef = adminDb.collection("conversations").doc(conversationId);
    const convDoc = await convRef.get();
    if (!convDoc.exists) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const conv = convDoc.data() as { participants?: string[] };
    const participants = Array.isArray(conv?.participants) ? conv.participants : [];
    if (!participants.includes(user.uid)) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    const peerUid = participants.find((uid) => uid !== user.uid);
    if (!peerUid) {
      return NextResponse.json({ error: "Conversation participant data is invalid" }, { status: 400 });
    }

    const [mySnap, peerSnap] = await Promise.all([
      adminDb.collection("user_profiles").where("uid", "==", user.uid).limit(1).get(),
      adminDb.collection("user_profiles").where("uid", "==", peerUid).limit(1).get(),
    ]);

    const myProfile = mySnap.empty ? null : mySnap.docs[0].data();
    const peerProfile = peerSnap.empty ? null : peerSnap.docs[0].data();

    const myPublicKey = myProfile?.publicKey;
    const peerPublicKey = peerProfile?.publicKey;

    if (!myPublicKey || !peerPublicKey) {
      return NextResponse.json(
        { error: "Both users must have encryption keys set up" },
        { status: 400 }
      );
    }

    const conversationKey = crypto.randomBytes(32).toString("base64");

    return NextResponse.json({
      conversationId,
      peerUid,
      peerPublicKey,
      conversationKey,
    });
  } catch (err) {
    console.error("[api/conversations/[id]/bootstrap-key] POST error", err);
    return NextResponse.json({ error: "Failed to bootstrap conversation key" }, { status: 500 });
  }
}

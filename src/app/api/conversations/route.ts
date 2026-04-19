import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — create or return existing conversation
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const user = await verifyFirebaseIdToken(authHeader.replace(/^Bearer\s+/i, ""));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.peerUid || typeof body.peerUid !== "string") {
    return NextResponse.json({ error: "peerUid required" }, { status: 400 });
  }

  const peerUid = body.peerUid;
  if (peerUid === user.uid) {
    return NextResponse.json({ error: "Cannot chat with yourself" }, { status: 400 });
  }

  // Build sorted participants key
  const participants = [user.uid, peerUid].sort();
  const participantsKey = participants.join("_");

  try {
    // Check if conversation already exists
    const existing = await adminDb
      .collection("conversations")
      .where("participantsKey", "==", participantsKey)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      return NextResponse.json({ id: doc.id, ...doc.data() });
    }

    // Get both users' public keys for key wrapping
    const [myProfile, peerProfile] = await Promise.all([
      adminDb.collection("user_profiles").doc(user.uid).get(),
      adminDb.collection("user_profiles").doc(peerUid).get(),
    ]);

    if (!peerProfile.exists) {
      return NextResponse.json({ error: "Peer user not found" }, { status: 404 });
    }

    const myPubKey = myProfile.data()?.publicKey;
    const peerPubKey = peerProfile.data()?.publicKey;

    if (!myPubKey || !peerPubKey) {
      return NextResponse.json(
        { error: "Both users must have encryption keys set up" },
        { status: 400 }
      );
    }

    // Generate a random conversation key (32 bytes AES-256)
    // The actual wrapping happens client-side for true E2E; server stores wrapped keys
    // Here we pass back the raw key material for the creator to wrap
    const conversationKey = crypto.randomBytes(32).toString("base64");

    // Create conversation document
    const convRef = adminDb.collection("conversations").doc();
    await convRef.set({
      participants,
      participantsKey,
      createdAt: FieldValue.serverTimestamp(),
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessagePreview: "",
      wrappedKeys: {}, // Client will update with wrapped keys
      unread: { [user.uid]: 0, [peerUid]: 0 },
      typing: {},
    });

    return NextResponse.json({
      id: convRef.id,
      participants,
      participantsKey,
      conversationKey, // Only sent on creation; client wraps and updates
      peerPublicKey: peerPubKey,
    });
  } catch (err) {
    console.error("[api/conversations] POST error", err);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}

// GET — list user's conversations
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const user = await verifyFirebaseIdToken(authHeader.replace(/^Bearer\s+/i, ""));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snapshot = await adminDb
      .collection("conversations")
      .where("participants", "array-contains", user.uid)
      .orderBy("lastMessageAt", "desc")
      .limit(50)
      .get();

    const conversations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[api/conversations] GET error", err);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

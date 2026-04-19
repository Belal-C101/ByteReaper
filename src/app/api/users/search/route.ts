import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const user = await verifyFirebaseIdToken(authHeader.replace(/^Bearer\s+/i, ""));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const profilesRef = adminDb.collection("user_profiles");

    // Search by username prefix
    const byUsername = await profilesRef
      .where("usernameLower", ">=", q)
      .where("usernameLower", "<=", q + "\uf8ff")
      .limit(10)
      .get();

    // Search by email prefix
    const byEmail = await profilesRef
      .where("emailLower", ">=", q)
      .where("emailLower", "<=", q + "\uf8ff")
      .limit(10)
      .get();

    const seen = new Set<string>();
    const results: Array<{
      uid: string;
      username: string;
      displayName: string;
      email: string;
      photoURL?: string;
      publicKey: string;
    }> = [];

    const addDoc = (doc: FirebaseFirestore.DocumentSnapshot) => {
      const data = doc.data();
      if (!data || data.uid === user.uid || seen.has(data.uid)) return;
      seen.add(data.uid);
      results.push({
        uid: data.uid,
        username: data.username,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL,
        publicKey: data.publicKey,
      });
    };

    byUsername.forEach(addDoc);
    byEmail.forEach(addDoc);

    return NextResponse.json({ results: results.slice(0, 10) });
  } catch (err) {
    console.error("[api/users/search] error", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

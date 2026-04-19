import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseIdTokenDetailed,
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase/admin";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mask(val: string | undefined): string {
  if (!val) return "(missing)";
  if (val.length <= 8) return "***";
  return `${val.slice(0, 4)}…${val.slice(-4)} (len=${val.length})`;
}

export async function GET(req: NextRequest) {
  const report: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      FIREBASE_PROJECT_ID: mask(process.env.FIREBASE_PROJECT_ID),
      FIREBASE_CLIENT_EMAIL: mask(process.env.FIREBASE_CLIENT_EMAIL),
      FIREBASE_PRIVATE_KEY_present: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_PRIVATE_KEY_length: process.env.FIREBASE_PRIVATE_KEY?.length ?? 0,
      FIREBASE_PRIVATE_KEY_starts_with_BEGIN: process.env.FIREBASE_PRIVATE_KEY?.startsWith("-----BEGIN") ?? false,
      FIREBASE_PRIVATE_KEY_has_literal_backslash_n: (process.env.FIREBASE_PRIVATE_KEY || "").includes("\\n"),
      FIREBASE_PRIVATE_KEY_has_real_newline: (process.env.FIREBASE_PRIVATE_KEY || "").includes("\n"),
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: mask(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    },
  };

  // 1) Token verification test
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const verifyResult = await verifyFirebaseIdTokenDetailed(token);
  report.tokenVerification = {
    ok: verifyResult.ok,
    error: verifyResult.error,
    errorCode: verifyResult.errorCode,
    decodedEmail: verifyResult.decoded?.email,
    decodedUid: verifyResult.decoded?.uid,
    decodedAud: verifyResult.decoded?.aud,
    isAdminEmail: isAdminEmail(verifyResult.decoded?.email),
  };

  // Gate the heavier checks to admin only (if we can identify an admin)
  if (!verifyResult.ok || !isAdminEmail(verifyResult.decoded?.email)) {
    return NextResponse.json({
      ...report,
      note: "Sign in as admin and retry to see listUsers / Firestore diagnostics.",
    }, { status: verifyResult.ok ? 403 : 401 });
  }

  // 2) listUsers test (needs Firebase Auth Admin permission)
  try {
    const page = await getAdminAuth().listUsers(1);
    report.listUsersTest = {
      ok: true,
      firstUserEmail: page.users[0]?.email ?? null,
      hasNextPageToken: !!page.pageToken,
    };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    report.listUsersTest = {
      ok: false,
      error: e.message,
      errorCode: e.code,
    };
  }

  // 3) Firestore read test (user_profiles count)
  try {
    const snap = await getAdminDb().collection("user_profiles").limit(5).get();
    report.userProfilesTest = {
      ok: true,
      count_first_5: snap.size,
      sampleUids: snap.docs.map((d) => d.get("uid")).filter(Boolean),
    };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    report.userProfilesTest = {
      ok: false,
      error: e.message,
      errorCode: e.code,
    };
  }

  // 4) Auth users total count (heavier — list all pages up to 1000)
  try {
    let total = 0;
    let pageToken: string | undefined;
    let iterations = 0;
    do {
      const page = await getAdminAuth().listUsers(1000, pageToken);
      total += page.users.length;
      pageToken = page.pageToken;
      iterations += 1;
      if (iterations > 5) break; // safety cap
    } while (pageToken);
    report.totalAuthUsers = total;
  } catch (err) {
    report.totalAuthUsers = { error: (err as Error).message };
  }

  return NextResponse.json(report);
}

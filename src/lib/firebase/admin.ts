import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function ensureInitialized() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!getApps().length) {
    const missing: string[] = [];
    if (!projectId) missing.push("FIREBASE_PROJECT_ID");
    if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
    if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
    if (missing.length > 0) {
      throw new Error(`Firebase Admin missing env vars: ${missing.join(", ")}`);
    }
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: (privateKey as string).replace(/\\n/g, "\n"),
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Firebase Admin init failed: ${msg}`);
    }
  }
}

let _adminAuth: Auth | null = null;
let _adminDb: Firestore | null = null;

export function getAdminAuth(): Auth {
  if (!_adminAuth) {
    ensureInitialized();
    _adminAuth = getAuth();
  }
  return _adminAuth;
}

export function getAdminDb(): Firestore {
  if (!_adminDb) {
    ensureInitialized();
    _adminDb = getFirestore();
  }
  return _adminDb;
}

// Keep backward-compatible named exports as getters (bind methods so `this` is correct)
export const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    const target = getAdminAuth();
    const value = (target as unknown as Record<string, unknown>)[prop as string];
    return typeof value === "function" ? (value as Function).bind(target) : value;
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    const target = getAdminDb();
    const value = (target as unknown as Record<string, unknown>)[prop as string];
    return typeof value === "function" ? (value as Function).bind(target) : value;
  },
});

export interface VerifyTokenResult {
  ok: boolean;
  decoded: Awaited<ReturnType<Auth["verifyIdToken"]>> | null;
  error?: string;
  errorCode?: string;
}

export async function verifyFirebaseIdTokenDetailed(idToken: string): Promise<VerifyTokenResult> {
  if (!idToken) {
    return { ok: false, decoded: null, error: "No ID token provided", errorCode: "no-token" };
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return { ok: true, decoded };
  } catch (err) {
    const e = err as { code?: string; message?: string; errorInfo?: { code?: string; message?: string } };
    const errorCode = e.errorInfo?.code || e.code || "unknown";
    const error = e.errorInfo?.message || e.message || "Token verification failed";
    console.error("[firebase-admin] verifyIdToken FAILED:", errorCode, "-", error);
    return { ok: false, decoded: null, error, errorCode };
  }
}

// Back-compat wrapper — keeps existing call sites working
export async function verifyFirebaseIdToken(idToken: string) {
  const r = await verifyFirebaseIdTokenDetailed(idToken);
  return r.decoded;
}

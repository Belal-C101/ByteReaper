import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function ensureInitialized() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!getApps().length) {
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Firebase Admin environment variables are not configured");
    }
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
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

export async function verifyFirebaseIdToken(idToken: string) {
  if (!idToken) return null;
  try {
    return await getAdminAuth().verifyIdToken(idToken);
  } catch {
    return null;
  }
}

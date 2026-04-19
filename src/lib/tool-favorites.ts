import {
  doc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

const USER_TOOL_FAVORITES_COLLECTION = "user_tool_favorites";
const MAX_TOOL_FAVORITES = 300;

function sanitizeFavoriteSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  ).slice(0, MAX_TOOL_FAVORITES);
}

/**
 * Get user tool favorites. Uses email as doc key with lazy migration from old UID-keyed docs.
 */
export async function getUserToolFavorites(
  email: string,
  uid: string
): Promise<string[]> {
  // Try email-keyed doc first
  const emailRef = doc(db, USER_TOOL_FAVORITES_COLLECTION, email);
  const emailSnap = await getDoc(emailRef);
  if (emailSnap.exists()) {
    return sanitizeFavoriteSlugs(emailSnap.data().favorites);
  }

  // Lazy migrate from UID-keyed doc
  const uidRef = doc(db, USER_TOOL_FAVORITES_COLLECTION, uid);
  const uidSnap = await getDoc(uidRef);
  if (uidSnap.exists()) {
    const oldFavs = sanitizeFavoriteSlugs(uidSnap.data().favorites);
    // Copy to email-keyed doc
    await setDoc(emailRef, {
      userId: uid,
      email,
      favorites: oldFavs,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // Delete old UID-keyed doc
    await deleteDoc(uidRef);
    return oldFavs;
  }

  return [];
}

export async function saveUserToolFavorites(
  email: string,
  uid: string,
  favorites: string[]
): Promise<string[]> {
  const next = sanitizeFavoriteSlugs(favorites);
  const ref = doc(db, USER_TOOL_FAVORITES_COLLECTION, email);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    await updateDoc(ref, {
      favorites: next,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      userId: uid,
      email,
      favorites: next,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return next;
}

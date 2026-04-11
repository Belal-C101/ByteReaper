import {
  doc,
  getDoc,
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

export async function getUserToolFavorites(userId: string): Promise<string[]> {
  const snapshot = await getDoc(doc(db, USER_TOOL_FAVORITES_COLLECTION, userId));
  if (!snapshot.exists()) return [];

  const data = snapshot.data();
  return sanitizeFavoriteSlugs(data.favorites);
}

export async function saveUserToolFavorites(userId: string, favorites: string[]): Promise<string[]> {
  const next = sanitizeFavoriteSlugs(favorites);
  const ref = doc(db, USER_TOOL_FAVORITES_COLLECTION, userId);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    await updateDoc(ref, {
      favorites: next,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      userId,
      favorites: next,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return next;
}

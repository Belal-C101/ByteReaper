// Firebase Authentication Service
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

async function syncUserProfile(user: User, displayNameOverride?: string) {
  const userRef = doc(db, 'users', user.uid);
  const existingProfile = await getDoc(userRef);
  const now = Timestamp.now();

  if (!existingProfile.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: displayNameOverride ?? user.displayName,
      photoURL: user.photoURL ?? null,
      createdAt: now,
      lastLogin: now,
    });
    return;
  }

  await setDoc(
    userRef,
    {
      displayName: displayNameOverride ?? user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      lastLogin: now,
    },
    { merge: true }
  );
}

// Sign up with email and password
export async function signUpWithEmail(email: string, password: string, displayName: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Sync user profile without blocking successful auth
    try {
      await syncUserProfile(user, displayName);
    } catch (profileError) {
      console.error('Failed to sync user profile after sign up:', profileError);
    }

    return user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign up');
  }
}

// Sign in with email and password
export async function signInWithEmail(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Sync user profile without blocking successful auth
    try {
      await syncUserProfile(userCredential.user);
    } catch (profileError) {
      console.error('Failed to sync user profile after sign in:', profileError);
    }

    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in');
  }
}

// Sign in with Google
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Sync user profile without blocking successful auth
    try {
      await syncUserProfile(user);
    } catch (profileError) {
      console.error('Failed to sync user profile after Google sign in:', profileError);
    }

    return user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign in with Google');
  }
}

// Sign out
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to sign out');
  }
}

// Get current user
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

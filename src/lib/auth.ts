// Firebase Authentication Service
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';

function getUserProfileDocId(user: User): string {
  const email = user.email?.trim();

  if (!email) {
    throw new Error('Authenticated user does not have an email address.');
  }

  return email;
}

async function syncUserProfile(user: User, displayNameOverride?: string, username?: string) {
  const userEmail = user.email?.trim();
  if (!userEmail) {
    throw new Error('Authenticated user does not have an email address.');
  }

  const userDocId = getUserProfileDocId(user);
  const userRef = doc(db, 'users', userDocId);
  const existingProfile = await getDoc(userRef);
  const now = Timestamp.now();

  if (!existingProfile.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: userEmail,
      emailDocId: userDocId,
      displayName: displayNameOverride ?? user.displayName,
      username: username ?? null,
      photoURL: user.photoURL ?? null,
      createdAt: now,
      lastLogin: now,
    });
    return;
  }

  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: userEmail,
      emailDocId: userDocId,
      displayName: displayNameOverride ?? user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      lastLogin: now,
    },
    { merge: true }
  );
}

// Sign up with email and password
export async function signUpWithEmail(email: string, password: string, displayName: string, username?: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Set Firebase Auth display name
    if (displayName) {
      await updateProfile(user, { displayName });
    }

    // Sync user profile without blocking successful auth
    try {
      await syncUserProfile(user, displayName, username || undefined);
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

// Update user profile (display name and username)
export async function updateUserProfile(
  user: User,
  newDisplayName?: string,
  newUsername?: string
) {
  const userEmail = user.email?.trim();
  if (!userEmail) {
    throw new Error('User does not have an email address.');
  }

  // Update Firebase Auth display name
  if (newDisplayName !== undefined) {
    await updateProfile(user, { displayName: newDisplayName || null });
  }

  // Update Firestore user document
  const userRef = doc(db, 'users', userEmail);
  const updateData: Record<string, any> = {};
  if (newDisplayName !== undefined) {
    updateData.displayName = newDisplayName || null;
  }
  if (newUsername !== undefined) {
    updateData.username = newUsername || null;
  }

  if (Object.keys(updateData).length > 0) {
    await setDoc(userRef, updateData, { merge: true });
  }
}

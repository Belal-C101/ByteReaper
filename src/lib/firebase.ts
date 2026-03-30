// Firebase Configuration
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBdg5wW7lk-vUgneNYjrKZz8XRjaZ1c4no",
  authDomain: "bytereaper.firebaseapp.com",
  projectId: "bytereaper",
  storageBucket: "bytereaper.firebasestorage.app",
  messagingSenderId: "542720019974",
  appId: "1:542720019974:web:4c856ac0d9868cba4f7d87",
  measurementId: "G-XDRWK1S7XL"
};

// Initialize Firebase (prevent re-initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore
export const db = getFirestore(app);

export default app;

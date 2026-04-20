"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { hashPassword } from "@/lib/messenger-crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Loader2 } from "lucide-react";

export default function MessengerSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const handleSetup = async () => {
    setError("");

    const trimmed = username.trim();

    // Validation
    if (trimmed.length < 3 || trimmed.length > 24) {
      setError("Username must be 3–24 characters");
      return;
    }
    if (!/^[A-Za-z0-9_.\-]+$/.test(trimmed)) {
      setError("Username can only contain letters, numbers, underscores, dots, and hyphens");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one letter and one digit");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      // Check username availability
      const usernameLower = trimmed.toLowerCase();
      const usernameDoc = await getDoc(doc(db, "messenger_usernames", usernameLower));
      if (usernameDoc.exists()) {
        setError("Username already taken");
        setLoading(false);
        return;
      }

      // Hash password
      const { hash: passwordHash, salt: passwordSalt } = await hashPassword(password);

      // Atomic write: profile + username reservation
      const batch = writeBatch(db);
      batch.set(doc(db, "messenger_usernames", usernameLower), {
        uid: user.uid,
      });
      batch.set(doc(db, "messenger_profiles", user.uid), {
        uid: user.uid,
        username: trimmed,
        usernameLower,
        passwordHash,
        passwordSalt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      router.push("/chat");
    } catch (err) {
      console.error("Messenger setup error:", err);
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Set Up Messenger Profile</h1>
            <p className="text-xs text-muted-foreground">
              Create your messenger identity
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground/80 mb-1 block">
              Username
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ByteReaper"
              maxLength={24}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              3–24 chars. Letters, numbers, underscores, dots, hyphens.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground/80 mb-1 block">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              At least 8 characters, one letter and one digit.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground/80 mb-1 block">
              Confirm Password
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button onClick={handleSetup} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            Create Messenger Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

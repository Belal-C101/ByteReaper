"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X, User as UserIcon, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.email);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setDisplayName(data.displayName || user.displayName || "");
        setUsername(data.username || "");
      } else {
        setDisplayName(user.displayName || "");
        setUsername("");
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setDisplayName(user?.displayName || "");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen || !user) return;
    setError("");
    setSuccess(false);
    void loadProfile();
  }, [isOpen, user, loadProfile]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSave = async () => {
    if (!user?.email) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      // Update Firebase Auth display name
      await updateProfile(user, { displayName: displayName.trim() || null });

      // Update Firestore user document
      const userRef = doc(db, "users", user.email);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        await updateDoc(userRef, {
          displayName: displayName.trim() || null,
          username: username.trim() || null,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Profile</h2>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {error && (
                      <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-green-500/10 text-green-500 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Profile updated successfully!
                      </motion.div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground/80">Display Name</label>
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        disabled={saving}
                        className="bg-background/50"
                      />
                      <p className="text-[11px] text-muted-foreground/60">
                        This is how other users will see you
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground/80">Username</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/50">@</span>
                        <Input
                          value={username}
                          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                          placeholder="username"
                          disabled={saving}
                          className="pl-8 bg-background/50"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground/60">
                        Letters, numbers, underscores, and hyphens only
                      </p>
                    </div>

                    {/* User info */}
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground/60">Email</span>
                        <span className="text-foreground/80 font-mono text-xs">{user?.email}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground/60">Provider</span>
                        <span className="text-foreground/80 text-xs">
                          {user?.providerData[0]?.providerId === "google.com" ? "Google" : "Email/Password"}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              {!loading && (
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/40 bg-muted/20">
                  <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving || success}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : success ? (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5" />
                        Saved!
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  doc,
  getDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  Lock,
  ShieldCheck,
  Trash2,
  X,
  Loader2,
  User as UserIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";

interface MessengerProfile {
  uid: string;
  username: string;
  usernameLower: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: unknown;
  updatedAt: unknown;
}

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = "messenger" | "private" | "encrypted";

const TABS: { key: TabKey; label: string; icon: React.ReactNode; path: string }[] = [
  { key: "messenger", label: "Messenger", icon: <MessageCircle className="h-4 w-4" />, path: "/chat" },
  { key: "private", label: "Private Messenger", icon: <Lock className="h-4 w-4" />, path: "/messenger/private" },
  { key: "encrypted", label: "Encrypted Messenger", icon: <ShieldCheck className="h-4 w-4" />, path: "/messenger/encrypted" },
];

export function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<MessengerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Determine active tab from current path
  const activeTab: TabKey = pathname?.startsWith("/messenger/encrypted")
    ? "encrypted"
    : pathname?.startsWith("/messenger/private")
      ? "private"
      : "messenger";

  // Remember last tab
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mg:lastTab", activeTab);
    }
  }, [activeTab]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "messenger_profiles", user.uid));
      if (snap.exists()) {
        setProfile(snap.data() as MessengerProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Failed to load messenger profile:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      loadProfile();
    }
  }, [isOpen, user, loadProfile]);

  const handleDelete = async () => {
    if (!user || !profile) return;
    setDeleting(true);
    setDeleteError("");

    try {
      // Delete in order
      await deleteDoc(doc(db, "messenger_profiles", user.uid));
      await deleteDoc(doc(db, "messenger_usernames", profile.usernameLower));

      // Clear local state
      if (typeof window !== "undefined") {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("mg:")) localStorage.removeItem(key);
        });
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith("mg:")) sessionStorage.removeItem(key);
        });
      }

      setProfile(null);
      setConfirmText("");
      onClose();
      router.push("/messenger/setup");
    } catch (err) {
      console.error("Failed to delete messenger profile:", err);
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-[91] w-80 bg-card border-r border-border shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <h3 className="text-sm font-semibold">Messenger</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile card */}
            <div className="px-4 py-4 border-b border-border/30">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : profile ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-primary/70" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{profile.username}</p>
                      <p className="text-[11px] text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  {/* Delete profile button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete Profile
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete messenger profile?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently deletes your messenger profile, conversations, and voice
                          messages. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="py-2">
                        <label className="text-sm text-muted-foreground">
                          Type &quot;{profile.username}&quot; to confirm
                        </label>
                        <Input
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder={profile.username}
                          className="mt-1"
                        />
                        {deleteError && (
                          <p className="text-xs text-destructive mt-1">{deleteError}</p>
                        )}
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmText("")}>
                          Cancel
                        </AlertDialogCancel>
                        <Button
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={confirmText !== profile.username || deleting}
                        >
                          {deleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Delete
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">No messenger profile</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      onClose();
                      router.push("/messenger/setup");
                    }}
                  >
                    Set Up Profile
                  </Button>
                </div>
              )}
            </div>

            {/* Navigation tabs */}
            <nav className="flex-1 px-2 py-3 space-y-0.5">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    router.push(tab.path);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.key
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

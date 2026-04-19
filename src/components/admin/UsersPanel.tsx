"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Loader2,
  User,
  Mail,
  KeyRound,
  Trash2,
  Pencil,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  RefreshCw,
  MailPlus,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: string;
  lastSignIn: string;
  providerData: Array<{ providerId: string; email?: string }>;
}

async function adminFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export function UsersPanel() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await adminFetch<{ users: AuthUser[] }>("/api/admin/users");
      setUsers(data.users || []);
    } catch (err) {
      setUsers([]);
      setLoadError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const selectedUser = useMemo(
    () => users.find((u) => u.uid === selectedUid) ?? null,
    [users, selectedUid]
  );

  const clearResult = () => {
    setTimeout(() => setActionResult(null), 4000);
  };

  const handleUpdateName = async (uid: string) => {
    if (!editName.trim()) return;
    setActionLoading("updateProfile");
    try {
      const data = await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ uid, action: "updateProfile", displayName: editName.trim() }),
      });
      if (data.error) throw new Error(data.error);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, displayName: editName.trim() } : u))
      );
      setEditMode(null);
      setActionResult({ type: "success", message: "Name updated" });
    } catch (err) {
      setActionResult({
        type: "error",
        message: err instanceof Error ? err.message : "Update failed",
      });
    } finally {
      setActionLoading(null);
      clearResult();
    }
  };

  const handleResetPassword = async (uid: string) => {
    setActionLoading("resetPassword");
    try {
      const data = await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ uid, action: "resetPassword" }),
      });
      if (data.error) throw new Error(data.error);
      setActionResult({
        type: "success",
        message: "Password reset link generated",
      });
      if (data.link) {
        await navigator.clipboard.writeText(data.link);
        setCopiedLink("resetPassword");
        setTimeout(() => setCopiedLink(null), 3000);
      }
    } catch (err) {
      setActionResult({
        type: "error",
        message: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setActionLoading(null);
      clearResult();
    }
  };

  const handleChangeEmail = async (uid: string) => {
    if (!newEmail.trim()) return;
    setActionLoading("changeEmail");
    try {
      const data = await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ uid, action: "changeEmail", newEmail: newEmail.trim() }),
      });
      if (data.error) throw new Error(data.error);
      setActionResult({
        type: "success",
        message: "Email change link generated",
      });
      if (data.link) {
        await navigator.clipboard.writeText(data.link);
        setCopiedLink("changeEmail");
        setTimeout(() => setCopiedLink(null), 3000);
      }
      setShowEmailInput(false);
      setNewEmail("");
    } catch (err) {
      setActionResult({
        type: "error",
        message: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setActionLoading(null);
      clearResult();
    }
  };

  const handleToggleDisable = async (uid: string, currentlyDisabled: boolean) => {
    const action = currentlyDisabled ? "enableUser" : "disableUser";
    setActionLoading(action);
    try {
      const data = await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ uid, action }),
      });
      if (data.error) throw new Error(data.error);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, disabled: !currentlyDisabled } : u))
      );
      setActionResult({
        type: "success",
        message: currentlyDisabled ? "User enabled" : "User disabled",
      });
    } catch (err) {
      setActionResult({
        type: "error",
        message: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setActionLoading(null);
      clearResult();
    }
  };

  const handleDeleteUser = async (uid: string) => {
    setActionLoading("delete");
    try {
      const data = await adminFetch("/api/admin/users", {
        method: "DELETE",
        body: JSON.stringify({ uid }),
      });
      if (data.error) throw new Error(data.error);
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setSelectedUid(null);
      setConfirmDelete(null);
      setActionResult({ type: "success", message: "User deleted" });
    } catch (err) {
      setActionResult({
        type: "error",
        message: err instanceof Error ? err.message : "Delete failed",
      });
    } finally {
      setActionLoading(null);
      clearResult();
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // ─── Loading state ──────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-[600px]">
      {/* ── Left: User List ───────────────────────── */}
      <div className="border rounded-xl bg-card">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              All Users
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {users.length}
              </Badge>
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={loadUsers}
              disabled={loading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or UID..."
              className="pl-8 h-8 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="h-[540px]">
          <div className="p-1.5">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((u) => (
                <motion.button
                  key={u.uid}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  onClick={() => {
                    setSelectedUid(u.uid);
                    setEditMode(null);
                    setShowEmailInput(false);
                    setConfirmDelete(null);
                  }}
                  className={cn(
                    "w-full text-left p-2.5 rounded-lg transition-colors mb-0.5",
                    selectedUid === u.uid
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt=""
                        className="h-8 w-8 rounded-full shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {u.displayName || "No name"}
                        </span>
                        {u.disabled && (
                          <Badge
                            variant="destructive"
                            className="text-[9px] px-1 py-0"
                          >
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {u.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 font-mono truncate mt-0.5">
                        {u.uid}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>

            {loadError && (
              <div className="mx-1.5 my-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium mb-1">Failed to load users</p>
                    <p className="opacity-90 break-words">{loadError}</p>
                    <p className="mt-2 opacity-75">
                      Visit{" "}
                      <a
                        href="/api/admin/diagnostics"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        /api/admin/diagnostics
                      </a>{" "}
                      to see server-side auth status.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {filteredUsers.length === 0 && !loadError && (
              <div className="text-center py-10 text-sm text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right: User Details & Actions ─────────── */}
      <div className="border rounded-xl bg-card">
        {!selectedUser ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center">
              <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Select a user to manage</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="p-5 space-y-5">
              {/* Result Banner */}
              <AnimatePresence>
                {actionResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm flex items-center gap-2",
                      actionResult.type === "success"
                        ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                        : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                    )}
                  >
                    {actionResult.type === "success" ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                    )}
                    {actionResult.message}
                    {copiedLink && (
                      <span className="ml-auto text-xs opacity-70">
                        (Link copied to clipboard)
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User Info Header */}
              <div className="flex items-start gap-4">
                {selectedUser.photoURL ? (
                  <img
                    src={selectedUser.photoURL}
                    alt=""
                    className="h-14 w-14 rounded-full"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {editMode === "name" ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm max-w-[200px]"
                        placeholder="Display name"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateName(selectedUser.uid);
                          if (e.key === "Escape") setEditMode(null);
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => handleUpdateName(selectedUser.uid)}
                        disabled={actionLoading === "updateProfile"}
                      >
                        {actionLoading === "updateProfile" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => setEditMode(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        {selectedUser.displayName || "No name"}
                      </h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditMode("name");
                          setEditName(selectedUser.displayName);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {selectedUser.email}
                    </span>
                    {selectedUser.emailVerified && (
                      <Badge
                        variant="outline"
                        className="text-[9px] border-green-500/30 text-green-600 dark:text-green-400"
                      >
                        Verified
                      </Badge>
                    )}
                    {selectedUser.disabled && (
                      <Badge variant="destructive" className="text-[9px]">
                        Disabled
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    User ID
                  </p>
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-mono break-all flex-1">
                      {selectedUser.uid}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => copyToClipboard(selectedUser.uid, "uid")}
                    >
                      {copiedLink === "uid" ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Providers
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.providerData.map((p, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {p.providerId === "google.com"
                          ? "Google"
                          : p.providerId === "password"
                          ? "Email/Password"
                          : p.providerId}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Created
                  </p>
                  <p className="text-xs">
                    {selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleString()
                      : "Unknown"}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Last Sign In
                  </p>
                  <p className="text-xs">
                    {selectedUser.lastSignIn
                      ? new Date(selectedUser.lastSignIn).toLocaleString()
                      : "Never"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Actions</h3>

                {/* Reset Password */}
                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Reset Password</p>
                      <p className="text-[11px] text-muted-foreground">
                        Generate a password reset link (copied to clipboard)
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetPassword(selectedUser.uid)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "resetPassword" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Generate Link
                  </Button>
                </div>

                {/* Change Email */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MailPlus className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Change Email</p>
                        <p className="text-[11px] text-muted-foreground">
                          Generate an email change verification link
                        </p>
                      </div>
                    </div>
                    {!showEmailInput && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEmailInput(true)}
                        disabled={!!actionLoading}
                      >
                        <Mail className="h-3.5 w-3.5 mr-1.5" />
                        Change
                      </Button>
                    )}
                  </div>
                  {showEmailInput && (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        placeholder="New email address"
                        className="h-8 text-xs flex-1"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        type="email"
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleChangeEmail(selectedUser.uid);
                          if (e.key === "Escape") {
                            setShowEmailInput(false);
                            setNewEmail("");
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => handleChangeEmail(selectedUser.uid)}
                        disabled={actionLoading === "changeEmail" || !newEmail.trim()}
                      >
                        {actionLoading === "changeEmail" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Send"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => {
                          setShowEmailInput(false);
                          setNewEmail("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {/* Enable / Disable */}
                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    {selectedUser.disabled ? (
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <ShieldOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {selectedUser.disabled
                          ? "Enable Account"
                          : "Disable Account"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedUser.disabled
                          ? "Re-enable this user's access"
                          : "Prevent this user from signing in"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={selectedUser.disabled ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      handleToggleDisable(selectedUser.uid, selectedUser.disabled)
                    }
                    disabled={!!actionLoading}
                  >
                    {(actionLoading === "enableUser" ||
                      actionLoading === "disableUser") && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    )}
                    {selectedUser.disabled ? "Enable" : "Disable"}
                  </Button>
                </div>

                <Separator />

                {/* Delete User — Danger Zone */}
                <div className="border border-red-500/20 rounded-lg p-3 bg-red-500/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          Delete User
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Permanently delete this account and all associated data
                        </p>
                      </div>
                    </div>
                    {confirmDelete === selectedUser.uid ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(selectedUser.uid)}
                          disabled={actionLoading === "delete"}
                        >
                          {actionLoading === "delete" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                        onClick={() => setConfirmDelete(selectedUser.uid)}
                        disabled={!!actionLoading}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

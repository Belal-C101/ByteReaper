"use client";

import { useAuth } from "@/contexts/AuthContext";
import { isAdminEmail } from "@/lib/admin";

export function useIsAdmin() {
  const { user, loading } = useAuth();
  const isAdmin =
    !loading && !!user && isAdminEmail(user.email) && !!user.emailVerified;
  return { isAdmin, loading };
}

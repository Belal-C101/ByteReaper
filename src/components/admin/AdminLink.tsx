"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export function AdminLink() {
  const { isAdmin } = useIsAdmin();
  if (!isAdmin) return null;
  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/20 dark:text-amber-400 transition-colors"
    >
      <Shield className="h-3.5 w-3.5" />
      Admin
    </Link>
  );
}

"use client";

import { Lock } from "lucide-react";

export default function PrivateMessengerPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <Lock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-xl font-semibold">Private Messenger</h1>
        <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
      </div>
    </div>
  );
}

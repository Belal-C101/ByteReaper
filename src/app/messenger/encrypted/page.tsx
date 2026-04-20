"use client";

import { ShieldCheck } from "lucide-react";

export default function EncryptedMessengerPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-xl font-semibold">Encrypted Messenger</h1>
        <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
      </div>
    </div>
  );
}

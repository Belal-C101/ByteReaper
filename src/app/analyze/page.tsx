"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function AnalyzePage() {
  return (
    <ProtectedRoute>
      <ChatInterface />
    </ProtectedRoute>
  );
}
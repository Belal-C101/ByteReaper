"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, MessageSquare, MessageCircle } from "lucide-react";
import { AIChatsPanel } from "@/components/admin/AIChatsPanel";
import { MessengerPanel } from "@/components/admin/MessengerPanel";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("ai-chats");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6 lg:px-10 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  Admin Dashboard
                </h1>
                <Badge
                  variant="outline"
                  className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px]"
                >
                  ADMIN
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                View all users&apos; chats and conversations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 lg:px-10 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="ai-chats" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              AI Chats
            </TabsTrigger>
            <TabsTrigger value="messenger" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Messenger
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-chats" className="mt-4">
            <AIChatsPanel />
          </TabsContent>

          <TabsContent value="messenger" className="mt-4">
            <MessengerPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

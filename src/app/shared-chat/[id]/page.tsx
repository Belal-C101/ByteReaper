"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2 } from "lucide-react";
import { getSharedChat, SharedChat } from "@/lib/chat-history";

export default function SharedChatPage() {
  const params = useParams<{ id: string }>();
  const shareId = typeof params?.id === "string" ? params.id : "";

  const [sharedChat, setSharedChat] = useState<SharedChat | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!shareId) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    getSharedChat(shareId)
      .then((result) => {
        if (isMounted) {
          setSharedChat(result);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shareId]);

  return (
    <section className="min-h-[calc(100vh-8rem)] py-8">
      <div className="container px-4 mx-auto max-w-4xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold">Shared Chat</h1>
          <Link href="/analyze" className="text-sm rounded-md border px-3 py-2 hover:bg-accent">
            Open ByteReaper
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-xl border p-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !sharedChat ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground">
            This shared chat link is invalid or no longer available.
          </div>
        ) : (
          <>
            <header className="rounded-xl border p-4 bg-card/40">
              <h2 className="text-xl font-medium">{sharedChat.title}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Shared {sharedChat.updatedAt.toLocaleString()} · {sharedChat.messages.length} messages
              </p>
            </header>

            <div className="space-y-3">
              {sharedChat.messages.map((message) => (
                <article
                  key={message.id}
                  className={`rounded-xl border p-4 ${message.role === "user" ? "bg-primary/[0.05]" : "bg-card/30"}`}
                >
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    {message.role === "user" ? "User" : "Assistant"}
                  </p>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

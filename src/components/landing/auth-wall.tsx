"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Chrome,
  Loader2,
  Sparkles,
  Folder,
  CheckCircle2,
  Circle,
  FileText,
  Skull,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signInWithGoogle } from "@/lib/auth";

const CONTEXT_ITEMS = [
  "Meeting transcript.md",
  "SKILL.md",
  "Claude in Chrome",
  "Notion",
  "Linear",
];

const TASK_ITEMS = [
  { id: 1, text: "Read meeting transcript", done: true },
  { id: 2, text: "Pull out key points", done: true },
  { id: 3, text: "Find action items", done: true },
  { id: 4, text: "Check calendar", done: false },
  { id: 5, text: "Write summary", done: false },
];

function getEmailLoginHref(email: string): string {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return "/login";
  }

  return `/login?email=${encodeURIComponent(trimmedEmail)}`;
}

export function AuthWall() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle();
      router.replace("/analyze");
    } catch (signInError: any) {
      setError(signInError?.message || "Failed to sign in with Google.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailContinue = (event: FormEvent) => {
    event.preventDefault();
    router.push(getEmailLoginHref(email));
  };

  return (
    <section className="relative min-h-[calc(100vh-8rem)] overflow-hidden py-8 md:py-12">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(115,115,115,0.18),transparent_45%),radial-gradient(circle_at_80%_40%,rgba(59,130,246,0.2),transparent_38%)]" />
      </div>

      <div className="container px-4 mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-xl mx-auto lg:mx-0"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card/60 text-sm mb-5">
              <Skull className="h-4 w-4 text-primary" />
              <span className="font-medium">ByteReaper</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.08] mb-3">
              Think fast,
              <br />
              build faster
            </h1>

            <p className="text-muted-foreground text-lg mb-8">
              Sign in to start your ByteReaper workspace. Chat and analysis are available only after login.
            </p>

            <Card className="p-5 md:p-6 bg-card/70 border-white/10 backdrop-blur">
              {error && (
                <div className="mb-4 bg-destructive/10 text-destructive px-4 py-2.5 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Chrome className="h-4 w-4 mr-2" />
                      Continue with Google
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <form onSubmit={handleEmailContinue} className="space-y-3">
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                  />

                  <Button type="submit" className="w-full">
                    Continue with email
                  </Button>
                </form>

                <p className="text-sm text-center text-muted-foreground">
                  New here?{" "}
                  <Link href="/signup" className="text-primary hover:underline font-medium">
                    Create account
                  </Link>
                </p>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="hidden lg:block"
          >
            <div className="rounded-3xl border bg-card/50 backdrop-blur overflow-hidden min-h-[560px] shadow-2xl">
              <div className="h-full p-6 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:38px_38px]">
                <div className="relative h-full">
                  <div className="absolute top-0 left-0 w-[52%] rounded-xl border bg-background/70 p-4">
                    <p className="text-xs text-muted-foreground mb-3">Workspace</p>
                    <div className="space-y-2">
                      <div className="h-8 rounded-md bg-muted/40 flex items-center px-3 text-sm text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" /> Search
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="rounded-md border p-2 text-xs text-muted-foreground">
                          <Folder className="h-4 w-4 text-primary mb-1" /> Analysis
                        </div>
                        <div className="rounded-md border p-2 text-xs text-muted-foreground">
                          <Folder className="h-4 w-4 text-primary mb-1" /> Reports
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-16 left-[22%] w-[48%] rounded-xl border bg-background/70 p-4">
                    <p className="text-sm font-medium mb-3">Progress</p>
                    <ul className="space-y-2.5 text-sm">
                      {TASK_ITEMS.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 text-muted-foreground">
                          {item.done ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="absolute top-10 right-0 w-[36%] rounded-xl border bg-background/70 p-4">
                    <p className="text-sm font-medium mb-3">Context</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {CONTEXT_ITEMS.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          <span className="truncate">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

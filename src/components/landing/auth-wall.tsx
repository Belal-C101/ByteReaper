"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Chrome,
  Loader2,
  Sparkles,
  Code2,
  MessageSquare,
  Shield,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signInWithGoogle } from "@/lib/auth";

const CAPABILITIES = [
  {
    icon: MessageSquare,
    label: "AI Chat",
    desc: "Natural conversation with context",
  },
  {
    icon: Code2,
    label: "Code Review",
    desc: "Bugs, patterns & architecture",
  },
  {
    icon: Shield,
    label: "Security Scan",
    desc: "Vulnerability detection",
  },
  {
    icon: Zap,
    label: "Performance",
    desc: "Optimization suggestions",
  },
];

function getEmailLoginHref(email: string): string {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) return "/login";
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
    <section className="relative min-h-[calc(100vh-7rem)] overflow-hidden flex items-center">
      {/* Animated background orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-primary/[0.07] blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 15, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-blue-400/[0.06] blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, 15, 0], y: [0, 25, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[50%] left-[60%] w-[300px] h-[300px] rounded-full bg-slate-400/[0.04] blur-[80px]"
        />
      </div>

      <div className="container px-4 mx-auto py-8 md:py-12">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — Auth Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="max-w-lg mx-auto lg:mx-0"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm text-sm mb-6"
            >
              <Image
                src="/brand/bytereaper-mark.svg"
                alt="ByteReaper logo"
                width={16}
                height={16}
                className="h-4 w-4"
              />
              <span className="font-medium text-muted-foreground">ByteReaper</span>
              <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
            </motion.div>

            <h1 className="text-4xl md:text-[3.25rem] font-semibold tracking-tight leading-[1.1] mb-3">
              Think fast,
              <br />
              build{" "}
              <span className="text-gradient">smarter</span>
            </h1>

            <p className="text-muted-foreground text-base md:text-lg mb-8 leading-relaxed max-w-md">
              Your AI-powered code analysis workspace. Chat, review, and ship with confidence.
            </p>

            <Card className="p-5 md:p-6 bg-card/70 border-border/50 backdrop-blur-lg shadow-xl shadow-black/[0.03] dark:shadow-black/[0.15]">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4 bg-destructive/10 text-destructive px-4 py-2.5 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 gap-2.5 hover:bg-accent/80 transition-all duration-200"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                >
                  {isGoogleLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      <Chrome className="h-4 w-4" />
                      Continue with Google
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground/60">or</span>
                  </div>
                </div>

                <form onSubmit={handleEmailContinue} className="space-y-3">
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                    className="h-11"
                  />
                  <Button type="submit" className="w-full h-11 gap-2 shadow-sm">
                    Continue with email
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </form>

                <p className="text-sm text-center text-muted-foreground pt-1">
                  New here?{" "}
                  <Link href="/signup" className="text-primary hover:underline font-medium">
                    Create account
                  </Link>
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Right — Feature Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Main showcase card */}
              <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-lg overflow-hidden shadow-2xl shadow-black/[0.04] dark:shadow-black/[0.2]">
                <div className="p-6 md:p-8">
                  {/* Terminal-style header */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-3 w-3 rounded-full bg-red-400/60" />
                    <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                    <div className="h-3 w-3 rounded-full bg-green-400/60" />
                    <span className="ml-3 text-xs text-muted-foreground/50 font-mono">bytereaper.ai</span>
                  </div>

                  {/* Chat preview */}
                  <div className="space-y-4 mb-6">
                    {/* User bubble */}
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                      className="flex justify-end"
                    >
                      <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-md text-sm max-w-[80%]">
                        Review my React component for performance issues
                      </div>
                    </motion.div>

                    {/* AI bubble */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7, duration: 0.4 }}
                      className="flex justify-start"
                    >
                      <div className="relative bg-secondary/60 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm max-w-[85%]">
                        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary/40" />
                        <div className="pl-3">
                          <p className="text-muted-foreground leading-relaxed">
                            I found <span className="text-foreground font-medium">3 issues</span>: unnecessary re-renders on line 42, missing <code className="text-xs bg-muted px-1 py-0.5 rounded">useMemo</code> for expensive computation, and a stale closure in useEffect…
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Capabilities grid */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.4 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    {CAPABILITIES.map((cap, i) => (
                      <motion.div
                        key={cap.label}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.1 + i * 0.08, duration: 0.3 }}
                        className="group rounded-xl border border-border/40 bg-background/50 p-3.5 hover:border-primary/30 hover:bg-primary/[0.03] transition-all duration-300"
                      >
                        <cap.icon className="h-4.5 w-4.5 text-primary/70 mb-2 group-hover:text-primary transition-colors" />
                        <p className="text-sm font-medium mb-0.5">{cap.label}</p>
                        <p className="text-xs text-muted-foreground/70">{cap.desc}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </div>

              {/* Floating accent elements */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-3 -right-3 h-20 w-20 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm"
              />
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 h-16 w-16 rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

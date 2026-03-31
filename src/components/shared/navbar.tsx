"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Github, MessageSquare, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-strong">
      <div className="w-full px-4 sm:px-6 lg:px-10 flex h-14 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ rotate: 8, scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <Image
              src="/brand/bytereaper-mark.svg"
              alt="ByteReaper logo"
              width={30}
              height={30}
              className="h-[30px] w-[30px]"
              priority
            />
          </motion.div>
          <span className="font-semibold text-lg hidden sm:inline tracking-tight">
            ByteReaper
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Link href="/analyze">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Chat</span>
                </Button>
              </Link>

              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60 mx-1">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="h-3 w-3 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground max-w-[140px] truncate">
                  {user.email}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-sm">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="text-sm shadow-sm">
                  Sign Up
                </Button>
              </Link>
            </>
          )}

          <div className="w-px h-5 bg-border mx-1" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <a
            href="https://github.com/Belal-C101/ByteReaper"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Github className="h-4 w-4" />
            </Button>
          </a>
        </nav>
      </div>
    </header>
  );
}
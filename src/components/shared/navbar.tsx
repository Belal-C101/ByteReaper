"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Github, MessageSquare, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";

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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 sm:px-6 lg:px-10 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/brand/bytereaper-mark.svg"
            alt="ByteReaper logo"
            width={34}
            height={34}
            className="h-[34px] w-[34px]"
            priority
          />
          <span className="font-bold text-2xl hidden sm:inline tracking-tight">ByteReaper</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <Link href="/analyze">
                <Button variant="ghost" size="sm" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Chat</span>
                </Button>
              </Link>

              <div className="flex items-center gap-2 px-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm hidden md:inline">{user.email}</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="default" size="sm">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <a
            href="https://github.com/Belal-C101/ByteReaper"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon">
              <Github className="h-5 w-5" />
            </Button>
          </a>
        </nav>
      </div>
    </header>
  );
}
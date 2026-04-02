"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Github, MessageSquare, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ProfileModal } from "./profile-modal";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      setProfileDropdownOpen(false);
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <>
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

                {/* Profile dropdown */}
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/60 hover:bg-secondary/80 transition-all duration-200 cursor-pointer"
                  >
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground max-w-[140px] truncate">
                      {user.displayName || user.email}
                    </span>
                    <ChevronDown className={`h-3 w-3 text-muted-foreground/60 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setProfileDropdownOpen(false)}
                        />

                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-1.5 w-52 z-50 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-xl shadow-xl overflow-hidden"
                        >
                          {/* User info header */}
                          <div className="px-3 py-2.5 border-b border-border/30">
                            <p className="text-sm font-medium truncate">{user.displayName || 'User'}</p>
                            <p className="text-[11px] text-muted-foreground/60 truncate">{user.email}</p>
                          </div>

                          {/* Menu items */}
                          <div className="py-1">
                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                setProfileModalOpen(true);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent/60 transition-colors text-left"
                            >
                              <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              Profile
                            </button>

                            <div className="mx-2 my-1 border-t border-border/30" />

                            <button
                              onClick={handleSignOut}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive/80 hover:text-destructive transition-colors text-left"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              Sign Out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile sign out (no dropdown) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-1.5 text-muted-foreground hover:text-foreground transition-colors md:hidden"
                >
                  <LogOut className="h-3.5 w-3.5" />
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

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </>
  );
}
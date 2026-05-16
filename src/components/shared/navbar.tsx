"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Github,
  MessageSquare,
  MessageCircle,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Wrench,
  Menu,
  X,
  Palette,
  Check,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ProfileModal } from "./profile-modal";
import { ProfileDrawer } from "@/components/messenger/ProfileDrawer";
import { AdminLink } from "@/components/admin/AdminLink";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [messengerDrawerOpen, setMessengerDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeOptions: Array<{ value: string; label: string }> = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "theme-ocean", label: "Ocean" },
    { value: "theme-forest", label: "Forest" },
    { value: "theme-sunset", label: "Sunset" },
  ];

  const activeTheme = mounted ? theme : undefined;
  const currentThemeLabel = themeOptions.find((option) => option.value === activeTheme)?.label || "Theme";

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
          <div className="flex items-center gap-3">
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
            <AdminLink />
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Link href="/tools">
                <Wrench className="h-4 w-4" />
                <span className="text-sm">Tools</span>
              </Link>
            </Button>

            {user ? (
              <>
                <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Link href="/analyze">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">Chat</span>
                  </Link>
                </Button>

                <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground transition-colors" title="Private Messages">
                  <Link href="/chat">
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">Messages</span>
                  </Link>
                </Button>

                <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Link href="/docs">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm">Docs</span>
                  </Link>
                </Button>

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

                            <button
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                setMessengerDrawerOpen(true);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent/60 transition-colors text-left"
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              Messenger Profile
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
                  aria-label="Sign out"
                  title="Sign out"
                  className="gap-1.5 text-muted-foreground hover:text-foreground transition-colors md:hidden"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
                  <Link href="/login">
                    Login
                  </Link>
                </Button>
                <Button asChild size="sm" className="text-sm shadow-sm">
                  <Link href="/signup">
                    Sign Up
                  </Link>
                </Button>
              </>
            )}

            <div className="w-px h-5 bg-border mx-1" />

            <div className="relative hidden md:block">
              <button
                onClick={() => setThemeMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Open theme picker"
                title="Change theme"
              >
                <Palette className="h-3.5 w-3.5" />
                <span>{currentThemeLabel}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${themeMenuOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {themeMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setThemeMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-xl shadow-2xl p-1.5"
                    >
                      {themeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setTheme(option.value);
                            setThemeMenuOpen(false);
                          }}
                          className="w-full flex items-center justify-between rounded-md px-2.5 py-2 text-sm hover:bg-accent"
                        >
                          <span>{option.label}</span>
                          {activeTheme === option.value && <Check className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <a
                href="https://github.com/Belal-C101/ByteReaper"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open ByteReaper GitHub repository"
                title="Open ByteReaper GitHub repository"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground md:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </nav>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl"
            >
              <div className="px-4 py-3 space-y-1">
                <Link
                  href="/tools"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <Wrench className="h-4 w-4" />
                  Tools Hub
                </Link>

                {user ? (
                  <>
                    <Link
                      href="/analyze"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </Link>
                    <Link
                      href="/chat"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Messages
                    </Link>
                    <Link
                      href="/docs"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      <BookOpen className="h-4 w-4" />
                      Docs
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full text-left flex items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                    >
                      Sign Up
                    </Link>
                  </>
                )}

                <div className="mt-2 pt-2 border-t border-border/40">
                  <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Theme</p>
                  <div className="grid grid-cols-2 gap-1">
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTheme(option.value)}
                        className={`rounded-md px-3 py-1.5 text-xs text-left ${activeTheme === option.value ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Messenger Profile Drawer */}
      <ProfileDrawer
        isOpen={messengerDrawerOpen}
        onClose={() => setMessengerDrawerOpen(false)}
      />
    </>
  );
}

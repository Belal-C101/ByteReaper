"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Github, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative">
            <Skull className="h-8 w-8 text-primary" />
            <div className="absolute -inset-1 bg-primary/20 blur-lg rounded-full -z-10" />
          </div>
          <span className="font-bold text-xl">
            Byte<span className="text-primary">Reaper</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/analyze">
            <Button variant="ghost">Analyze</Button>
          </Link>
          
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
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon">
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Button>
          </a>
        </div>
      </div>
    </nav>
  );
}
import Image from "next/image";
import { Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="relative border-t border-border/50">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="w-full px-4 sm:px-6 lg:px-10 flex flex-col items-center justify-between gap-4 h-14 md:flex-row">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Image
            src="/brand/bytereaper-mark.svg"
            alt="ByteReaper logo"
            width={18}
            height={18}
            className="h-[18px] w-[18px] opacity-60"
          />
          <span className="text-xs tracking-wide">
            ByteReaper — AI-Powered Code Analysis
          </span>
        </div>
        <a
          href="https://www.linkedin.com/in/belal-hegab"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Belal Hegab LinkedIn"
        >
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Linkedin className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </footer>
  );
}
import Image from "next/image";
import { Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="w-full px-4 sm:px-6 lg:px-10 flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Image
            src="/brand/bytereaper-mark.svg"
            alt="ByteReaper logo"
            width={20}
            height={20}
            className="h-5 w-5"
          />
          <span className="text-sm">
            ByteReaper - AI-Powered Code Analysis
          </span>
        </div>
        <a
          href="https://www.linkedin.com/in/belal-hegab"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Belal Hegab LinkedIn"
        >
          <Button variant="ghost" size="icon">
            <Linkedin className="h-5 w-5" />
          </Button>
        </a>
      </div>
    </footer>
  );
}
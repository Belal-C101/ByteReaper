import { Skull } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Skull className="h-5 w-5" />
          <span className="text-sm">
            ByteReaper - AI-Powered Code Analysis
          </span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Built with Next.js, Tailwind CSS, and Google Gemini
        </p>
      </div>
    </footer>
  );
}
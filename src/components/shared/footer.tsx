import Image from "next/image";

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
          href="https://github.com/Belal-C101/ByteReaper"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          github.com/Belal-C101/ByteReaper
        </a>
      </div>
    </footer>
  );
}
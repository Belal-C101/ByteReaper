import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Image
        src="/brand/bytereaper-mark.svg"
        alt="ByteReaper logo"
        width={96}
        height={96}
        className="h-24 w-24 mb-6"
      />
      <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you're looking for doesn't exist or the report has been removed.
      </p>
      <Link href="/">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}
import Link from "next/link";
import { ChevronRight, Home, Wrench } from "lucide-react";

interface ToolPageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function ToolPageShell({ title, description, children }: ToolPageShellProps) {
  return (
    <section className="min-h-[calc(100vh-8rem)] py-8">
      <div className="container px-4 mx-auto space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/tools" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <Wrench className="h-3.5 w-3.5" />
            Tools
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{title}</span>
        </nav>

        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground max-w-3xl">{description}</p>
        </header>

        <div className="rounded-2xl border bg-card/40 p-4 md:p-6">{children}</div>
      </div>
    </section>
  );
}

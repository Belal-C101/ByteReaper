"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ToolIconGlyph } from "@/components/tools/tool-icon";
import { TOOL_COUNT, TOOLS } from "@/lib/tools/catalog";

const FEATURED_TOOLS = TOOLS.filter((tool) => tool.featured).slice(0, 8);

export function DeveloperToolsSection() {
  return (
    <section className="py-14 md:py-20">
      <div className="container px-4 mx-auto space-y-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">
              {TOOL_COUNT}+ Free Developer Tools
            </Badge>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Developer Tools, Built Into ByteReaper</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Skip tab hopping. Format data, generate assets, inspect code, and launch AI-powered helpers from one workspace.
            </p>
          </div>
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors self-start"
          >
            Browse all tools
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {FEATURED_TOOLS.map((tool) => (
            <Card key={tool.slug} className="p-4 h-full hover:border-primary/50 transition-colors">
              <Link href={`/tools/${tool.slug}`} className="h-full flex flex-col gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <ToolIconGlyph icon={tool.icon} className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

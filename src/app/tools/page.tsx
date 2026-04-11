"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ToolIconGlyph } from "@/components/tools/tool-icon";
import { TOOL_CATEGORIES, TOOL_COUNT, TOOLS } from "@/lib/tools/catalog";

export default function ToolsHubPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<(typeof TOOL_CATEGORIES)[number]>("All");

  const filteredTools = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return TOOLS.filter((tool) => {
      const categoryMatch = activeCategory === "All" || tool.category === activeCategory;
      const queryMatch =
        !normalized ||
        tool.title.toLowerCase().includes(normalized) ||
        tool.description.toLowerCase().includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [query, activeCategory]);

  return (
    <section className="min-h-[calc(100vh-8rem)] py-8 md:py-10">
      <div className="container px-4 mx-auto space-y-6">
        <header className="rounded-2xl border bg-card/50 p-5 md:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" />
                Tools Hub
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">Build Faster With Free Dev Tools</h1>
              <p className="text-muted-foreground mt-2 max-w-3xl">
                Browse and launch {TOOL_COUNT}+ free tools across utilities, converters, generators, API exploration, AI workflows, and reference pages.
              </p>
            </div>
            <Badge className="self-start md:self-auto" variant="secondary">
              {TOOL_COUNT}+ tools
            </Badge>
          </div>

          <div className="mt-5 relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tools by name or purpose"
              className="pl-9"
              aria-label="Search tools"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TOOL_CATEGORIES.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent border-border"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTools.map((tool) => (
            <Card key={tool.slug} className="p-4 h-full transition-all hover:border-primary/50 hover:bg-card/70">
              <Link href={`/tools/${tool.slug}`} className="h-full flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ToolIconGlyph icon={tool.icon} className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {tool.isNew && <Badge className="text-[10px]">New</Badge>}
                    <Badge variant="outline" className="text-[10px]">{tool.category}</Badge>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h2 className="font-semibold leading-tight">{tool.title}</h2>
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

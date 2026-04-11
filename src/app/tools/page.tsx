"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Star, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ToolIconGlyph } from "@/components/tools/tool-icon";
import { TOOL_CATEGORIES, TOOL_COUNT, TOOLS } from "@/lib/tools/catalog";

const TOOL_FAVORITES_STORAGE_KEY = "bytereaper_tool_favorites";
const TOOL_TABS = ["Favorites", ...TOOL_CATEGORIES] as const;
type ToolTab = (typeof TOOL_TABS)[number];

export default function ToolsHubPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ToolTab>("All");
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(TOOL_FAVORITES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const safeFavorites = parsed.filter((item): item is string => typeof item === "string");
        setFavorites(safeFavorites);
      }
    } catch {
      setFavorites([]);
    }
  }, []);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const toggleFavorite = (slug: string) => {
    setFavorites((prev) => {
      const next = prev.includes(slug) ? prev.filter((value) => value !== slug) : [...prev, slug];
      window.localStorage.setItem(TOOL_FAVORITES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filteredTools = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return TOOLS.filter((tool) => {
      const categoryMatch =
        activeCategory === "All" ||
        (activeCategory === "Favorites" ? favoriteSet.has(tool.slug) : tool.category === activeCategory);
      const queryMatch =
        !normalized ||
        tool.title.toLowerCase().includes(normalized) ||
        tool.description.toLowerCase().includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [query, activeCategory, favoriteSet]);

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
            {TOOL_TABS.map((category) => (
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
                {category === "Favorites" && favorites.length > 0 ? ` (${favorites.length})` : ""}
              </button>
            ))}
          </div>
        </header>

        {activeCategory === "Favorites" && favorites.length === 0 && (
          <Card className="p-4 border-dashed">
            <p className="text-sm text-muted-foreground">
              No favorites yet. Click the star icon on any tool card to add it to Favorites.
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTools.map((tool) => (
            <Card key={tool.slug} className="relative p-4 h-full transition-all hover:border-primary/50 hover:bg-card/70">
              <button
                type="button"
                onClick={() => toggleFavorite(tool.slug)}
                aria-label={favoriteSet.has(tool.slug) ? `Remove ${tool.title} from favorites` : `Add ${tool.title} to favorites`}
                title={favoriteSet.has(tool.slug) ? "Remove from favorites" : "Add to favorites"}
                className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background/80 hover:bg-accent transition-colors"
              >
                <Star className={`h-4 w-4 ${favoriteSet.has(tool.slug) ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
              </button>

              <Link href={`/tools/${tool.slug}`} className="h-full flex flex-col gap-4 pr-9">
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

type Feed = "hn" | "devto" | "reddit";

interface NewsItem {
  id: string;
  title: string;
  url: string;
  points: number;
  comments: number;
  createdAt: number;
  source: string;
}

function timeAgo(unixSeconds: number): string {
  const delta = Math.floor(Date.now() / 1000) - unixSeconds;
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

export default function NewsPage() {
  const [activeFeed, setActiveFeed] = useState<Feed>("hn");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadFeed = async (feed: Feed) => {
    setLoading(true);
    setError("");

    try {
      if (feed === "hn") {
        const topIds = (await (await fetch("https://hacker-news.firebaseio.com/v0/topstories.json")).json()) as number[];
        const selected = topIds.slice(0, 30);
        const hnItems = await Promise.all(
          selected.map(async (id) => {
            const item = await (await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)).json();
            return {
              id: String(item.id),
              title: item.title || "Untitled",
              url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
              points: item.score || 0,
              comments: item.descendants || 0,
              createdAt: item.time || Math.floor(Date.now() / 1000),
              source: "Hacker News",
            } as NewsItem;
          }),
        );
        setItems(hnItems);
      }

      if (feed === "devto") {
        const devto = (await (await fetch("https://dev.to/api/articles?per_page=30")).json()) as Array<Record<string, unknown>>;
        setItems(
          devto.map((article) => ({
            id: String(article.id),
            title: String(article.title || "Untitled"),
            url: String(article.url || "https://dev.to"),
            points: Number(article.positive_reactions_count || 0),
            comments: Number(article.comments_count || 0),
            createdAt: Math.floor(new Date(String(article.published_at || new Date().toISOString())).getTime() / 1000),
            source: "Dev.to",
          })),
        );
      }

      if (feed === "reddit") {
        const response = await fetch("https://www.reddit.com/r/programming/top.json?limit=30&t=day");
        const reddit = (await response.json()) as { data: { children: Array<{ data: Record<string, unknown> }> } };
        setItems(
          reddit.data.children.map((entry) => ({
            id: String(entry.data.id),
            title: String(entry.data.title || "Untitled"),
            url: String(entry.data.url || "https://reddit.com"),
            points: Number(entry.data.score || 0),
            comments: Number(entry.data.num_comments || 0),
            createdAt: Number(entry.data.created_utc || Math.floor(Date.now() / 1000)),
            source: "Reddit r/programming",
          })),
        );
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load feed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed(activeFeed);
  }, [activeFeed]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      void loadFeed(activeFeed);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [activeFeed, autoRefresh]);

  const title = useMemo(() => {
    if (activeFeed === "hn") return "Hacker News";
    if (activeFeed === "devto") return "Dev.to";
    return "Reddit r/programming";
  }, [activeFeed]);

  return (
    <ToolPageShell
      title="Tech News Aggregator"
      description="Track top stories from Hacker News, Dev.to, and Reddit with engagement metrics and quick links."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={activeFeed === "hn" ? "default" : "outline"} size="sm" onClick={() => setActiveFeed("hn")}>Hacker News</Button>
          <Button variant={activeFeed === "devto" ? "default" : "outline"} size="sm" onClick={() => setActiveFeed("devto")}>Dev.to</Button>
          <Button variant={activeFeed === "reddit" ? "default" : "outline"} size="sm" onClick={() => setActiveFeed("reddit")}>Reddit</Button>
          <label className="inline-flex items-center gap-2 text-sm ml-2">
            <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
            Auto-refresh (1m)
          </label>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {items.length} stories from {title}</p>
          <Button size="sm" variant="ghost" onClick={() => void loadFeed(activeFeed)} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border p-3">
              <a href={item.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{item.title}</a>
              <p className="text-xs text-muted-foreground mt-1">{item.points} points · {item.comments} comments · {timeAgo(item.createdAt)}</p>
            </article>
          ))}
        </div>
      </div>
    </ToolPageShell>
  );
}

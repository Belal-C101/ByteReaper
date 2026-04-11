"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolPageShell } from "@/components/tools/tool-page-shell";

interface TrendingRepo {
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  forks: number;
  starsSince: number;
}

export default function GithubTrendingPage() {
  const [language, setLanguage] = useState("");
  const [since, setSince] = useState("daily");
  const [repos, setRepos] = useState<TrendingRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTrending = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`https://api.gitterapp.com/repositories?language=${encodeURIComponent(language)}&since=${encodeURIComponent(since)}`);
      const data = (await response.json()) as Array<Record<string, unknown>>;

      const mapped = data.map((entry) => ({
        name: String(entry.name || "unknown"),
        description: String(entry.description || "No description"),
        url: String(entry.url || entry.html_url || "https://github.com"),
        language: String(entry.language || "Unknown"),
        stars: Number(entry.stars || entry.stargazers_count || 0),
        forks: Number(entry.forks || entry.forks_count || 0),
        starsSince: Number(entry.currentPeriodStars || 0),
      }));

      setRepos(mapped);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load trending repositories");
      setRepos([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolPageShell
      title="GitHub Trending"
      description="Explore trending repositories by language and period with stars, forks, and momentum metrics."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input value={language} onChange={(event) => setLanguage(event.target.value)} placeholder="TypeScript" className="max-w-xs" />
          <select value={since} onChange={(event) => setSince(event.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <Button onClick={() => void fetchTrending()} disabled={loading}>{loading ? "Loading..." : "Fetch trending"}</Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          {repos.map((repo) => (
            <article key={repo.url} className="rounded-xl border p-3 space-y-1">
              <a href={repo.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{repo.name}</a>
              <p className="text-sm text-muted-foreground">{repo.description}</p>
              <p className="text-xs text-muted-foreground">{repo.language} · {repo.stars} stars · {repo.forks} forks · +{repo.starsSince} today</p>
            </article>
          ))}
        </div>
      </div>
    </ToolPageShell>
  );
}

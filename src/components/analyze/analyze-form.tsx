"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseGitHubUrl } from "@/lib/utils/helpers";
import { AnalysisProgress } from "./analysis-progress";

export function AnalyzeForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{
    stage: string;
    progress: number;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    setIsAnalyzing(true);
    setProgress({ stage: "fetching", progress: 0, message: "Starting analysis..." });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: parsed.owner, repo: parsed.repo }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      // Redirect to report page
      router.push(`/report/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsAnalyzing(false);
      setProgress(null);
    }
  };

  const exampleRepos = [
    "facebook/react",
    "vercel/next.js",
    "microsoft/vscode",
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Analyze Repository</CardTitle>
        <CardDescription>
          Enter a public GitHub repository URL to start the analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAnalyzing && progress ? (
          <AnalysisProgress {...progress} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="https://github.com/owner/repo"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-10"
                  disabled={isAnalyzing}
                />
              </div>
              <Button type="submit" disabled={isAnalyzing || !url}>
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Analyze</span>
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                Try these examples:
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleRepos.map((repo) => (
                  <Button
                    key={repo}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUrl(`https://github.com/${repo}`)}
                    disabled={isAnalyzing}
                  >
                    {repo}
                  </Button>
                ))}
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
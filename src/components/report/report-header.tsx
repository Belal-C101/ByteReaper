"use client";

import { ExternalLink, Star, GitFork, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/shared/score-ring";
import { AnalysisResult } from "@/types/analysis";
import { formatDate, formatNumber, getScoreLabel } from "@/lib/utils/helpers";

interface ReportHeaderProps {
  result: AnalysisResult;
}

export function ReportHeader({ result }: ReportHeaderProps) {
  const { repoInfo, scores, techStack, metadata } = result;

  return (
    <div className="border-b pb-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Score */}
        <div className="flex flex-col items-center">
          <ScoreRing score={scores.overall} size="lg" />
          <span className="mt-2 text-lg font-semibold">
            {getScoreLabel(scores.overall)}
          </span>
        </div>

        {/* Repo Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {repoInfo.owner}/{repoInfo.name}
              </h1>
              {repoInfo.description && (
                <p className="text-muted-foreground mb-4">
                  {repoInfo.description}
                </p>
              )}
            </div>
            <a
              href={result.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View on GitHub
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Star className="h-4 w-4" />
              <span>{formatNumber(repoInfo.stars)} stars</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <GitFork className="h-4 w-4" />
              <span>{formatNumber(repoInfo.forks)} forks</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Analyzed {formatDate(metadata.analyzedAt)}</span>
            </div>
          </div>

          {/* Tech Stack Badges */}
          <div className="flex flex-wrap gap-2">
            {techStack.languages.slice(0, 3).map((lang) => (
              <Badge key={lang.name} variant="secondary">
                {lang.name} ({lang.percentage}%)
              </Badge>
            ))}
            {techStack.frameworks.map((fw) => (
              <Badge key={fw} variant="outline">
                {fw}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
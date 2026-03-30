"use client";

import { Code, Shield, Zap, Boxes, FileText, TestTube } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AnalysisScores } from "@/types/analysis";
import { getScoreColor } from "@/lib/utils/helpers";

interface ScoreBreakdownProps {
  scores: AnalysisScores;
}

const scoreCategories = [
  { key: "codeQuality", label: "Code Quality", icon: Code },
  { key: "security", label: "Security", icon: Shield },
  { key: "performance", label: "Performance", icon: Zap },
  { key: "architecture", label: "Architecture", icon: Boxes },
  { key: "documentation", label: "Documentation", icon: FileText },
  { key: "testing", label: "Testing", icon: TestTube },
] as const;

export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scoreCategories.map(({ key, label, icon: Icon }) => {
          const score = scores[key];
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                  {score}
                </span>
              </div>
              <Progress value={score} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
"use client";

import { CheckCircle, AlertCircle, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisResult } from "@/types/analysis";

interface SummaryCardProps {
  summary: AnalysisResult["summary"];
}

export function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Executive Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground">{summary.executive}</p>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Strengths */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-green-500">
              <CheckCircle className="h-4 w-4" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {summary.strengths.map((strength, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  • {strength}
                </li>
              ))}
            </ul>
          </div>

          {/* Concerns */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-orange-500">
              <AlertCircle className="h-4 w-4" />
              Concerns
            </h4>
            <ul className="space-y-1">
              {summary.concerns.map((concern, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  • {concern}
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-blue-500">
              <Lightbulb className="h-4 w-4" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {summary.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
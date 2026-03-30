"use client";

import { useState } from "react";
import { 
  Code, Shield, Zap, Boxes, FileText, TestTube,
  ChevronDown, ChevronUp, AlertTriangle, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Finding, Severity, FindingCategory } from "@/types/analysis";
import { SEVERITY_COLORS, CATEGORY_LABELS } from "@/lib/utils/constants";

interface FindingsListProps {
  findings: Finding[];
}

const categoryIcons: Record<FindingCategory, typeof Code> = {
  "code-quality": Code,
  security: Shield,
  performance: Zap,
  architecture: Boxes,
  documentation: FileText,
  testing: TestTube,
};

function FindingCard({ finding }: { finding: Finding }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = categoryIcons[finding.category] || AlertTriangle;
  const severityVariant = finding.severity as keyof typeof SEVERITY_COLORS;

  return (
    <Card className="border-l-4" style={{
      borderLeftColor: `hsl(var(--${finding.severity}))`
    }}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <CardTitle className="text-base">{finding.title}</CardTitle>
              {finding.file && (
                <p className="text-sm text-muted-foreground mt-1">
                  {finding.file}
                  {finding.line && `:${finding.line}`}
                </p>
              )}
            </div>
          </div>
          <Badge variant={severityVariant}>
            {finding.severity.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {finding.description}
        </p>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between"
        >
          {isExpanded ? "Show less" : "Show details"}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {isExpanded && (
          <div className="mt-4 space-y-4">
            {finding.code && (
              <div>
                <h4 className="text-sm font-medium mb-2">Code</h4>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                  <code>{finding.code}</code>
                </pre>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Suggestion
              </h4>
              <p className="text-sm text-muted-foreground">
                {finding.suggestion}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Impact
              </h4>
              <p className="text-sm text-muted-foreground">
                {finding.impact}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FindingsList({ findings }: FindingsListProps) {
  const severities: Severity[] = ["critical", "high", "medium", "low"];
  const categories = Object.keys(CATEGORY_LABELS) as FindingCategory[];

  const findingsBySeverity = severities.reduce((acc, severity) => {
    acc[severity] = findings.filter((f) => f.severity === severity);
    return acc;
  }, {} as Record<Severity, Finding[]>);

  const findingsByCategory = categories.reduce((acc, category) => {
    acc[category] = findings.filter((f) => f.category === category);
    return acc;
  }, {} as Record<FindingCategory, Finding[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Findings ({findings.length})</span>
          <div className="flex gap-2">
            {severities.map((severity) => (
              <Badge key={severity} variant={severity as any}>
                {findingsBySeverity[severity].length}
              </Badge>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="severity">By Severity</TabsTrigger>
            <TabsTrigger value="category">By Category</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {findings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No findings detected. Great job! 🎉
              </p>
            ) : (
              findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))
            )}
          </TabsContent>

          <TabsContent value="severity" className="space-y-6">
            {severities.map((severity) => (
              <div key={severity}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge variant={severity as any}>
                    {severity.toUpperCase()}
                  </Badge>
                  <span>({findingsBySeverity[severity].length})</span>
                </h3>
                <div className="space-y-4">
                  {findingsBySeverity[severity].length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No {severity} severity findings.
                    </p>
                  ) : (
                    findingsBySeverity[severity].map((finding) => (
                      <FindingCard key={finding.id} finding={finding} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="category" className="space-y-6">
            {categories.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {CATEGORY_LABELS[category]}
                    <span className="text-muted-foreground">
                      ({findingsByCategory[category].length})
                    </span>
                  </h3>
                  <div className="space-y-4">
                    {findingsByCategory[category].length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No findings in this category.
                      </p>
                    ) : (
                      findingsByCategory[category].map((finding) => (
                        <FindingCard key={finding.id} finding={finding} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
"use client";

import { 
  Code, Package, Hammer, TestTube, Workflow, 
  Database, Box, FolderGit 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TechStack } from "@/types/analysis";

interface TechStackCardProps {
  techStack: TechStack;
}

export function TechStackCard({ techStack }: TechStackCardProps) {
  const sections = [
    { 
      icon: Package, 
      title: "Package Manager", 
      items: techStack.packageManager ? [techStack.packageManager] : [] 
    },
    { icon: Box, title: "Frameworks", items: techStack.frameworks },
    { icon: Hammer, title: "Build Tools", items: techStack.buildTools },
    { icon: TestTube, title: "Test Frameworks", items: techStack.testFrameworks },
    { icon: Workflow, title: "CI/CD", items: techStack.cicd },
    { icon: Database, title: "Databases", items: techStack.databases },
    { icon: FolderGit, title: "Containerization", items: techStack.containerization },
  ].filter(s => s.items.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Tech Stack
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Languages */}
        <div>
          <h4 className="text-sm font-medium mb-3">Languages</h4>
          <div className="space-y-2">
            {techStack.languages.map((lang) => (
              <div key={lang.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{lang.name}</span>
                  <span className="text-muted-foreground">{lang.percentage}%</span>
                </div>
                <Progress value={lang.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Other sections */}
        {sections.map(({ icon: Icon, title, items }) => (
          <div key={title}>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {title}
            </h4>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
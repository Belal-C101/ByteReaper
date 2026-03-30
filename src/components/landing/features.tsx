"use client";

import { motion } from "framer-motion";
import { 
  Code, Shield, Zap, Boxes, FileText, TestTube, 
  BarChart, GitBranch, AlertTriangle 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Code,
    title: "Code Quality",
    description: "Detect code smells, naming issues, duplication, and error handling problems.",
  },
  {
    icon: Shield,
    title: "Security Analysis",
    description: "Find hardcoded secrets, injection risks, and authentication vulnerabilities.",
  },
  {
    icon: Zap,
    title: "Performance",
    description: "Identify N+1 queries, memory leaks, and inefficient algorithms.",
  },
  {
    icon: Boxes,
    title: "Architecture",
    description: "Evaluate project structure, separation of concerns, and modularity.",
  },
  {
    icon: FileText,
    title: "Documentation",
    description: "Check README quality, code comments, and API documentation coverage.",
  },
  {
    icon: TestTube,
    title: "Testing",
    description: "Analyze test coverage indicators and testing best practices.",
  },
  {
    icon: BarChart,
    title: "Health Score",
    description: "Get an overall repository health score from 0-100.",
  },
  {
    icon: GitBranch,
    title: "Tech Stack",
    description: "Automatic detection of languages, frameworks, and dependencies.",
  },
  {
    icon: AlertTriangle,
    title: "Priority Ranking",
    description: "Findings ranked by severity: Critical, High, Medium, Low.",
  },
];

export function Features() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comprehensive Code Analysis
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            ByteReaper analyzes your code across multiple dimensions to provide
            actionable insights that help you ship better software.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
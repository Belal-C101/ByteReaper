import { AnalysisResult, Finding, Severity } from './analysis';

export interface Report extends AnalysisResult {
  createdAt: string;
  shareId?: string;
}

export interface ReportSummary {
  id: string;
  repoName: string;
  repoOwner: string;
  overallScore: number;
  createdAt: string;
  findingsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface FindingsByCategory {
  category: string;
  findings: Finding[];
  count: number;
}

export interface FindingsBySeverity {
  severity: Severity;
  count: number;
  findings: Finding[];
}
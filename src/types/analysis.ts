export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type FindingCategory = 'code-quality' | 'security' | 'performance' | 'architecture' | 'documentation' | 'testing';

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  title: string;
  description: string;
  file?: string;
  line?: number;
  code?: string;
  suggestion: string;
  impact: string;
}

export interface TechStack {
  languages: { name: string; percentage: number; bytes: number }[];
  frameworks: string[];
  buildTools: string[];
  testFrameworks: string[];
  cicd: string[];
  databases: string[];
  packageManager: string | null;
  containerization: string[];
}

export interface AnalysisScores {
  overall: number;
  codeQuality: number;
  security: number;
  performance: number;
  architecture: number;
  documentation: number;
  testing: number;
}

export interface AnalysisResult {
  id: string;
  repoUrl: string;
  repoInfo: {
    owner: string;
    name: string;
    description: string | null;
    stars: number;
    forks: number;
    language: string | null;
  };
  techStack: TechStack;
  scores: AnalysisScores;
  findings: Finding[];
  summary: {
    executive: string;
    strengths: string[];
    concerns: string[];
    recommendations: string[];
  };
  metadata: {
    analyzedAt: string;
    filesAnalyzed: number;
    totalFiles: number;
    analysisTime: number;
  };
}

export interface AnalysisProgress {
  stage: 'fetching' | 'parsing' | 'analyzing' | 'generating' | 'complete' | 'error';
  progress: number;
  message: string;
}
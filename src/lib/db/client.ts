import { AnalysisResult } from '@/types/analysis';

// In-memory storage (persists during server runtime)
// For production, consider using a hosted database like Turso, PlanetScale, or Supabase
const reports = new Map<string, { data: AnalysisResult; createdAt: string }>();

export function saveReport(result: AnalysisResult): void {
  reports.set(result.id, {
    data: result,
    createdAt: new Date().toISOString(),
  });
}

export function getReport(id: string): AnalysisResult | null {
  const report = reports.get(id);
  return report?.data || null;
}

export function getRecentReports(limit = 10): Array<{
  id: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  overallScore: number;
  createdAt: string;
}> {
  const entries = Array.from(reports.entries())
    .sort((a, b) => new Date(b[1].createdAt).getTime() - new Date(a[1].createdAt).getTime())
    .slice(0, limit);
  
  return entries.map(([id, { data, createdAt }]) => ({
    id,
    repoUrl: data.repoUrl,
    repoOwner: data.repoInfo.owner,
    repoName: data.repoInfo.name,
    overallScore: data.scores.overall,
    createdAt,
  }));
}

export function getReportByRepo(owner: string, name: string): AnalysisResult | null {
  for (const [_, { data }] of reports.entries()) {
    if (data.repoInfo.owner === owner && data.repoInfo.name === name) {
      return data;
    }
  }
  return null;
}
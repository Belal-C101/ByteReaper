export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    repo_url TEXT NOT NULL,
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    overall_score INTEGER NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_reports_repo ON reports(repo_owner, repo_name);
  CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
`;

export interface ReportRow {
  id: string;
  repo_url: string;
  repo_owner: string;
  repo_name: string;
  overall_score: number;
  data: string;
  created_at: string;
}
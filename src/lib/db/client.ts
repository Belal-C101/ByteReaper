import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { CREATE_TABLES_SQL, ReportRow } from './schema';
import { AnalysisResult } from '@/types/analysis';

let db: Database.Database | null = null;

function getDbPath(): string {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'bytereaper.db');
}

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    db.exec(CREATE_TABLES_SQL);
  }
  return db;
}

export function saveReport(result: AnalysisResult): void {
  const db = getDatabase();
  
  db.prepare(`
    INSERT INTO reports (id, repo_url, repo_owner, repo_name, overall_score, data)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    result.id,
    result.repoUrl,
    result.repoInfo.owner,
    result.repoInfo.name,
    result.scores.overall,
    JSON.stringify(result)
  );
}

export function getReport(id: string): AnalysisResult | null {
  const db = getDatabase();
  
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow | undefined;
  
  if (!row) return null;
  
  return JSON.parse(row.data) as AnalysisResult;
}

export function getRecentReports(limit = 10): Array<{
  id: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  overallScore: number;
  createdAt: string;
}> {
  const db = getDatabase();
  
  const rows = db.prepare(`
    SELECT id, repo_url, repo_owner, repo_name, overall_score, created_at
    FROM reports
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as ReportRow[];
  
  return rows.map(row => ({
    id: row.id,
    repoUrl: row.repo_url,
    repoOwner: row.repo_owner,
    repoName: row.repo_name,
    overallScore: row.overall_score,
    createdAt: row.created_at,
  }));
}

export function getReportByRepo(owner: string, name: string): AnalysisResult | null {
  const db = getDatabase();
  
  const row = db.prepare(`
    SELECT * FROM reports 
    WHERE repo_owner = ? AND repo_name = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(owner, name) as ReportRow | undefined;
  
  if (!row) return null;
  
  return JSON.parse(row.data) as AnalysisResult;
}
import 'server-only';
import { getAdminDb } from '@/lib/firebase/admin';
import { AnalysisResult } from '@/types/analysis';

// Reports live in Firestore so they survive across serverless instances.
// Accessed only through the Admin SDK; firestore.rules has no client rule for this
// collection, so browsers cannot read or write it directly.
const REPORTS_COLLECTION = 'analysis_reports';

interface StoredReport {
  // Serialized AnalysisResult — avoids Firestore's nested-array and undefined-value limits
  data: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  overallScore: number;
  createdAt: string;
}

function reportsCollection() {
  return getAdminDb().collection(REPORTS_COLLECTION);
}

export async function saveReport(result: AnalysisResult): Promise<void> {
  const stored: StoredReport = {
    data: JSON.stringify(result),
    repoUrl: result.repoUrl,
    repoOwner: result.repoInfo.owner,
    repoName: result.repoInfo.name,
    overallScore: result.scores.overall,
    createdAt: new Date().toISOString(),
  };
  await reportsCollection().doc(result.id).set(stored);
}

export async function getReport(id: string): Promise<AnalysisResult | null> {
  const snapshot = await reportsCollection().doc(id).get();
  if (!snapshot.exists) return null;
  return JSON.parse((snapshot.data() as StoredReport).data) as AnalysisResult;
}

export async function getRecentReports(limit = 10): Promise<Array<{
  id: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  overallScore: number;
  createdAt: string;
}>> {
  const snapshot = await reportsCollection().orderBy('createdAt', 'desc').limit(limit).get();
  return snapshot.docs.map((doc) => {
    const { repoUrl, repoOwner, repoName, overallScore, createdAt } = doc.data() as StoredReport;
    return { id: doc.id, repoUrl, repoOwner, repoName, overallScore, createdAt };
  });
}

export async function getReportByRepo(owner: string, name: string): Promise<AnalysisResult | null> {
  const snapshot = await reportsCollection()
    .where('repoOwner', '==', owner)
    .where('repoName', '==', name)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return JSON.parse((snapshot.docs[0].data() as StoredReport).data) as AnalysisResult;
}

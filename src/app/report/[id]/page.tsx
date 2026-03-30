import { notFound } from "next/navigation";
import { getReport } from "@/lib/db/client";
import { ReportHeader } from "@/components/report/report-header";
import { SummaryCard } from "@/components/report/summary-card";
import { ScoreBreakdown } from "@/components/report/score-breakdown";
import { TechStackCard } from "@/components/report/tech-stack-card";
import { FindingsList } from "@/components/report/findings-list";

interface ReportPageProps {
  params: { id: string };
}

export default function ReportPage({ params }: ReportPageProps) {
  const report = getReport(params.id);

  if (!report) {
    notFound();
  }

  return (
    <div className="container py-8">
      <ReportHeader result={report} />
      
      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <ScoreBreakdown scores={report.scores} />
          <TechStackCard techStack={report.techStack} />
        </div>
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <SummaryCard summary={report.summary} />
          <FindingsList findings={report.findings} />
        </div>
      </div>
    </div>
  );
}
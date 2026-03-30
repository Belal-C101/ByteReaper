import { AnalyzeForm } from "@/components/analyze/analyze-form";

export default function AnalyzePage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">
          Analyze Your Repository
        </h1>
        <p className="text-muted-foreground">
          Enter a public GitHub repository URL to get a comprehensive
          code analysis report powered by AI.
        </p>
      </div>
      <AnalyzeForm />
    </div>
  );
}
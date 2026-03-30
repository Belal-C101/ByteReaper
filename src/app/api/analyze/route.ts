import { NextRequest, NextResponse } from "next/server";
import { analyzeRepository } from "@/lib/analysis/analyzer";
import { saveReport } from "@/lib/db/client";
import { parseGitHubUrl } from "@/lib/utils/helpers";

export const maxDuration = 120; // 2 minutes max for Vercel

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, url } = body;

    let repoOwner = owner;
    let repoName = repo;

    // Parse URL if provided instead of owner/repo
    if (url && !owner) {
      const parsed = parseGitHubUrl(url);
      if (!parsed) {
        return NextResponse.json(
          { error: "Invalid GitHub URL" },
          { status: 400 }
        );
      }
      repoOwner = parsed.owner;
      repoName = parsed.repo;
    }

    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { error: "Repository owner and name are required" },
        { status: 400 }
      );
    }

    // Perform analysis
    const result = await analyzeRepository(repoOwner, repoName);

    // Save to database
    saveReport(result);

    return NextResponse.json({
      success: true,
      id: result.id,
      scores: result.scores,
      findingsCount: result.findings.length,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    
    const message = error instanceof Error ? error.message : "Analysis failed";
    const status = message.includes("not found") ? 404 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
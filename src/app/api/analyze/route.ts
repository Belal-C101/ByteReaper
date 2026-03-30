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
          { error: "Invalid GitHub URL. Please use format: github.com/owner/repo" },
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

    console.log(`Starting analysis for ${repoOwner}/${repoName}`);

    // Perform analysis
    const result = await analyzeRepository(repoOwner, repoName);

    // Save to database
    saveReport(result);

    console.log(`Analysis complete for ${repoOwner}/${repoName}, score: ${result.scores.overall}`);

    return NextResponse.json({
      success: true,
      id: result.id,
      scores: result.scores,
      findingsCount: result.findings.length,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    
    let message = "Analysis failed. Please try again.";
    let status = 500;

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      
      if (errorMsg.includes("not found") || errorMsg.includes("404")) {
        message = "Repository not found. Make sure it exists and is public.";
        status = 404;
      } else if (errorMsg.includes("rate limit")) {
        message = "GitHub API rate limit exceeded. Please try again in a few minutes.";
        status = 429;
      } else if (errorMsg.includes("gemini") || errorMsg.includes("api key")) {
        message = "AI service unavailable. Please check your API configuration.";
        status = 503;
      } else if (errorMsg.includes("timeout")) {
        message = "Analysis timed out. The repository might be too large.";
        status = 408;
      } else {
        message = error.message;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
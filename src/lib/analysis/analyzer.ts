import 'server-only';

import { v4 as uuidv4 } from 'uuid';
import { fetchRepository, fetchRepositoryTree, fetchMultipleFiles } from '@/lib/github/fetcher';
import { prioritizeFiles, detectTechStackFromFiles } from '@/lib/github/parser';
import { generateAnalysis } from '@/lib/ai/gemini';
import { buildAnalysisPrompt } from '@/lib/ai/prompts';
import { AnalysisResult, Finding, AnalysisScores, TechStack } from '@/types/analysis';
import { generateId } from '@/lib/utils/helpers';

interface AnalysisOptions {
  onProgress?: (stage: string, progress: number, message: string) => void;
}

export async function analyzeRepository(
  owner: string,
  repo: string,
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  const { onProgress } = options;
  const startTime = Date.now();
  
  try {
    // Stage 1: Fetch repository info
    onProgress?.('fetching', 10, 'Fetching repository information...');
    const repoInfo = await fetchRepository(owner, repo);
    
    // Stage 2: Fetch file tree
    onProgress?.('fetching', 30, 'Fetching repository structure...');
    const tree = await fetchRepositoryTree(owner, repo, repoInfo.defaultBranch);
    
    // Stage 3: Prioritize and fetch file contents
    onProgress?.('parsing', 50, 'Analyzing file structure...');
    const prioritizedFiles = prioritizeFiles(tree);
    const filePaths = prioritizedFiles.map(f => f.path);
    
    onProgress?.('parsing', 60, `Fetching ${filePaths.length} key files...`);
    const fileContents = await fetchMultipleFiles(owner, repo, filePaths);
    
    // Stage 4: Detect tech stack
    onProgress?.('analyzing', 70, 'Detecting technology stack...');
    const techStack = detectTechStackFromFiles(tree, fileContents, repoInfo.languages);
    
    // Stage 5: AI Analysis
    onProgress?.('analyzing', 80, 'Running AI analysis...');
    const prompt = buildAnalysisPrompt(repoInfo, techStack, fileContents);
    const aiResponse = await generateAnalysis(prompt);
    
    // Stage 6: Parse AI response
    onProgress?.('generating', 90, 'Generating report...');
    const analysisData = parseAIResponse(aiResponse);
    
    // Build final result
    const result: AnalysisResult = {
      id: generateId(),
      repoUrl: `https://github.com/${owner}/${repo}`,
      repoInfo: {
        owner: repoInfo.owner,
        name: repoInfo.name,
        description: repoInfo.description,
        stars: repoInfo.stars,
        forks: repoInfo.forks,
        language: repoInfo.language,
      },
      techStack,
      scores: analysisData.scores,
      findings: analysisData.findings.map((f: any, i: number) => ({
        ...f,
        id: `finding-${i + 1}`,
      })),
      summary: analysisData.summary,
      metadata: {
        analyzedAt: new Date().toISOString(),
        filesAnalyzed: fileContents.size,
        totalFiles: tree.filter(f => f.type === 'file').length,
        analysisTime: Date.now() - startTime,
      },
    };
    
    onProgress?.('complete', 100, 'Analysis complete!');
    
    return result;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

function parseAIResponse(response: string): {
  scores: AnalysisScores;
  findings: Omit<Finding, 'id'>[];
  summary: AnalysisResult['summary'];
} {
  // Extract JSON from response
  const jsonMatch = response.match(/\`\`\`json\n?([\s\S]*?)\n?\`\`\`/);
  const jsonStr = jsonMatch ? jsonMatch[1] : response;
  
  try {
    const data = JSON.parse(jsonStr.trim());
    
    // Validate and provide defaults
    return {
      scores: {
        overall: data.scores?.overall ?? 50,
        codeQuality: data.scores?.codeQuality ?? 50,
        security: data.scores?.security ?? 50,
        performance: data.scores?.performance ?? 50,
        architecture: data.scores?.architecture ?? 50,
        documentation: data.scores?.documentation ?? 50,
        testing: data.scores?.testing ?? 50,
      },
      findings: (data.findings || []).map((f: any) => ({
        category: f.category || 'code-quality',
        severity: f.severity || 'medium',
        title: f.title || 'Untitled Finding',
        description: f.description || '',
        file: f.file,
        line: f.line,
        code: f.code,
        suggestion: f.suggestion || 'No suggestion provided',
        impact: f.impact || 'Unknown impact',
      })),
      summary: {
        executive: data.summary?.executive || 'Analysis completed.',
        strengths: data.summary?.strengths || [],
        concerns: data.summary?.concerns || [],
        recommendations: data.summary?.recommendations || [],
      },
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Raw response:', response);
    
    // Return minimal valid response
    return {
      scores: {
        overall: 50,
        codeQuality: 50,
        security: 50,
        performance: 50,
        architecture: 50,
        documentation: 50,
        testing: 50,
      },
      findings: [{
        category: 'code-quality',
        severity: 'medium',
        title: 'Analysis Parsing Error',
        description: 'The AI analysis could not be fully parsed. This may be due to an unusual code structure.',
        suggestion: 'Try analyzing the repository again.',
        impact: 'Some findings may be missing.',
      }],
      summary: {
        executive: 'Analysis completed with parsing warnings.',
        strengths: [],
        concerns: ['Analysis parsing encountered issues'],
        recommendations: ['Re-run analysis if results seem incomplete'],
      },
    };
  }
}
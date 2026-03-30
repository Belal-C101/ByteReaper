/**
 * ByteReaper Source Code Generator
 * 
 * This script creates all source files for the ByteReaper application.
 * Run: node generate-source.js
 */

const fs = require('fs');
const path = require('path');

const baseDir = __dirname;

// Helper to write file with directory creation
function writeFile(filePath, content) {
  const fullPath = path.join(baseDir, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
  console.log('  ✓', filePath);
}

console.log('🔧 Generating ByteReaper source files...\n');

// ============================================================================
// TYPES
// ============================================================================

writeFile('src/types/github.ts', `
export interface GitHubRepo {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  watchers: number;
  language: string | null;
  languages: Record<string, number>;
  topics: string[];
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  size: number;
  openIssues: number;
  license: string | null;
  isPrivate: boolean;
  hasReadme: boolean;
  hasLicense: boolean;
}

export interface GitHubFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size: number;
  content?: string;
  sha: string;
}

export interface GitHubTree {
  sha: string;
  tree: GitHubFile[];
  truncated: boolean;
}
`.trim());

writeFile('src/types/analysis.ts', `
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
`.trim());

writeFile('src/types/report.ts', `
import { AnalysisResult, Finding, Severity } from './analysis';

export interface Report extends AnalysisResult {
  createdAt: string;
  shareId?: string;
}

export interface ReportSummary {
  id: string;
  repoName: string;
  repoOwner: string;
  overallScore: number;
  createdAt: string;
  findingsCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface FindingsByCategory {
  category: string;
  findings: Finding[];
  count: number;
}

export interface FindingsBySeverity {
  severity: Severity;
  count: number;
  findings: Finding[];
}
`.trim());

// ============================================================================
// UTILITIES
// ============================================================================

writeFile('src/lib/utils/cn.ts', `
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`.trim());

writeFile('src/lib/utils/constants.ts', `
export const APP_NAME = 'ByteReaper';
export const APP_DESCRIPTION = 'AI-powered code analysis for GitHub repositories';

export const SEVERITY_COLORS = {
  critical: {
    bg: 'bg-critical',
    text: 'text-critical',
    border: 'border-critical',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  high: {
    bg: 'bg-high',
    text: 'text-high',
    border: 'border-high',
    badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  },
  medium: {
    bg: 'bg-medium',
    text: 'text-medium',
    border: 'border-medium',
    badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  low: {
    bg: 'bg-low',
    text: 'text-low',
    border: 'border-low',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
} as const;

export const CATEGORY_LABELS = {
  'code-quality': 'Code Quality',
  'security': 'Security',
  'performance': 'Performance',
  'architecture': 'Architecture',
  'documentation': 'Documentation',
  'testing': 'Testing',
} as const;

export const CATEGORY_ICONS = {
  'code-quality': 'Code',
  'security': 'Shield',
  'performance': 'Zap',
  'architecture': 'Boxes',
  'documentation': 'FileText',
  'testing': 'TestTube',
} as const;

export const MAX_FILES_TO_ANALYZE = 50;
export const MAX_FILE_SIZE_BYTES = 100 * 1024; // 100KB
export const ANALYSIS_TIMEOUT_MS = 120000; // 2 minutes
`.trim());

writeFile('src/lib/utils/helpers.ts', `
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const patterns = [
    /^https?:\\/\\/github\\.com\\/([^\\/]+)\\/([^\\/]+?)(?:\\.git)?(?:\\/.*)?$/,
    /^git@github\\.com:([^\\/]+)\\/([^\\/]+?)(?:\\.git)?$/,
    /^([^\\/]+)\\/([^\\/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\\.git$/, '') };
    }
  }
  return null;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  return (ms / 60000).toFixed(1) + 'm';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Needs Work';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}
`.trim());

// ============================================================================
// GITHUB INTEGRATION
// ============================================================================

writeFile('src/lib/github/client.ts', `
import { Octokit } from '@octokit/rest';

let octokitInstance: Octokit | null = null;

export function getOctokit(): Octokit {
  if (!octokitInstance) {
    octokitInstance = new Octokit({
      auth: process.env.GITHUB_TOKEN || undefined,
    });
  }
  return octokitInstance;
}

export function resetOctokit(): void {
  octokitInstance = null;
}
`.trim());

writeFile('src/lib/github/fetcher.ts', `
import { getOctokit } from './client';
import { GitHubRepo, GitHubFile } from '@/types/github';

export async function fetchRepository(owner: string, repo: string): Promise<GitHubRepo> {
  const octokit = getOctokit();
  
  const [repoData, languagesData] = await Promise.all([
    octokit.repos.get({ owner, repo }),
    octokit.repos.listLanguages({ owner, repo }),
  ]);

  const r = repoData.data;
  
  return {
    owner: r.owner.login,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    url: r.html_url,
    stars: r.stargazers_count,
    forks: r.forks_count,
    watchers: r.watchers_count,
    language: r.language,
    languages: languagesData.data,
    topics: r.topics || [],
    defaultBranch: r.default_branch,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pushedAt: r.pushed_at,
    size: r.size,
    openIssues: r.open_issues_count,
    license: r.license?.spdx_id || null,
    isPrivate: r.private,
    hasReadme: true, // Will be checked separately
    hasLicense: !!r.license,
  };
}

export async function fetchRepositoryTree(
  owner: string,
  repo: string,
  branch: string
): Promise<GitHubFile[]> {
  const octokit = getOctokit();
  
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: 'true',
  });

  return data.tree
    .filter((item): item is typeof item & { path: string; type: 'blob' | 'tree' } => 
      !!item.path && (item.type === 'blob' || item.type === 'tree')
    )
    .map((item) => ({
      path: item.path,
      name: item.path.split('/').pop() || item.path,
      type: item.type === 'blob' ? 'file' : 'dir',
      size: item.size || 0,
      sha: item.sha || '',
    }));
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  const octokit = getOctokit();
  
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    if ('content' in data && data.type === 'file') {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch (error) {
    console.error(\`Error fetching file \${path}:\`, error);
    return null;
  }
}

export async function fetchMultipleFiles(
  owner: string,
  repo: string,
  paths: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  // Fetch files in parallel with concurrency limit
  const batchSize = 10;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const contents = await Promise.all(
      batch.map(async (path) => {
        const content = await fetchFileContent(owner, repo, path);
        return { path, content };
      })
    );
    
    contents.forEach(({ path, content }) => {
      if (content) {
        results.set(path, content);
      }
    });
  }
  
  return results;
}
`.trim());

writeFile('src/lib/github/parser.ts', `
import { GitHubFile } from '@/types/github';
import { TechStack } from '@/types/analysis';
import { MAX_FILES_TO_ANALYZE, MAX_FILE_SIZE_BYTES } from '@/lib/utils/constants';

const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rb', '.php',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt', '.rs', '.scala',
  '.vue', '.svelte', '.astro'
];

const CONFIG_FILES = [
  'package.json', 'requirements.txt', 'Pipfile', 'pyproject.toml',
  'Gemfile', 'composer.json', 'Cargo.toml', 'go.mod', 'build.gradle',
  'pom.xml', '.csproj', 'Package.swift', 'mix.exs',
  'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  '.github/workflows', 'Jenkinsfile', '.gitlab-ci.yml', '.travis.yml',
  'tsconfig.json', 'webpack.config.js', 'vite.config.ts', 'rollup.config.js',
  '.eslintrc', '.prettierrc', 'jest.config.js', 'vitest.config.ts',
  'README.md', 'LICENSE', '.env.example'
];

export function isCodeFile(path: string): boolean {
  const ext = '.' + path.split('.').pop()?.toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

export function isConfigFile(path: string): boolean {
  return CONFIG_FILES.some(cf => 
    path.endsWith(cf) || path.includes(cf)
  );
}

export function isAnalyzableFile(file: GitHubFile): boolean {
  if (file.type !== 'file') return false;
  if (file.size > MAX_FILE_SIZE_BYTES) return false;
  
  // Skip common non-code directories
  const skipPaths = ['node_modules/', 'vendor/', 'dist/', 'build/', '.git/', '__pycache__/'];
  if (skipPaths.some(sp => file.path.includes(sp))) return false;
  
  return isCodeFile(file.path) || isConfigFile(file.path);
}

export function prioritizeFiles(files: GitHubFile[]): GitHubFile[] {
  const analyzable = files.filter(isAnalyzableFile);
  
  // Sort by priority: config files first, then by directory depth (prefer root), then alphabetically
  return analyzable
    .sort((a, b) => {
      const aIsConfig = isConfigFile(a.path);
      const bIsConfig = isConfigFile(b.path);
      
      if (aIsConfig && !bIsConfig) return -1;
      if (!aIsConfig && bIsConfig) return 1;
      
      const aDepth = a.path.split('/').length;
      const bDepth = b.path.split('/').length;
      
      if (aDepth !== bDepth) return aDepth - bDepth;
      
      return a.path.localeCompare(b.path);
    })
    .slice(0, MAX_FILES_TO_ANALYZE);
}

export function detectTechStackFromFiles(
  files: GitHubFile[],
  fileContents: Map<string, string>,
  languages: Record<string, number>
): TechStack {
  const techStack: TechStack = {
    languages: [],
    frameworks: [],
    buildTools: [],
    testFrameworks: [],
    cicd: [],
    databases: [],
    packageManager: null,
    containerization: [],
  };

  // Process languages
  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
  techStack.languages = Object.entries(languages)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: Math.round((bytes / totalBytes) * 100),
    }))
    .sort((a, b) => b.bytes - a.bytes);

  // Detect package manager and frameworks from package.json
  const packageJson = fileContents.get('package.json');
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      // Package manager
      if (files.some(f => f.name === 'yarn.lock')) techStack.packageManager = 'yarn';
      else if (files.some(f => f.name === 'pnpm-lock.yaml')) techStack.packageManager = 'pnpm';
      else if (files.some(f => f.name === 'package-lock.json')) techStack.packageManager = 'npm';
      
      // Frameworks
      if (deps['next']) techStack.frameworks.push('Next.js');
      if (deps['react']) techStack.frameworks.push('React');
      if (deps['vue']) techStack.frameworks.push('Vue.js');
      if (deps['@angular/core']) techStack.frameworks.push('Angular');
      if (deps['svelte']) techStack.frameworks.push('Svelte');
      if (deps['express']) techStack.frameworks.push('Express.js');
      if (deps['fastify']) techStack.frameworks.push('Fastify');
      if (deps['nestjs'] || deps['@nestjs/core']) techStack.frameworks.push('NestJS');
      if (deps['gatsby']) techStack.frameworks.push('Gatsby');
      if (deps['nuxt']) techStack.frameworks.push('Nuxt.js');
      
      // Build tools
      if (deps['webpack']) techStack.buildTools.push('Webpack');
      if (deps['vite']) techStack.buildTools.push('Vite');
      if (deps['rollup']) techStack.buildTools.push('Rollup');
      if (deps['esbuild']) techStack.buildTools.push('esbuild');
      if (deps['parcel']) techStack.buildTools.push('Parcel');
      if (deps['turbo']) techStack.buildTools.push('Turborepo');
      
      // Test frameworks
      if (deps['jest']) techStack.testFrameworks.push('Jest');
      if (deps['vitest']) techStack.testFrameworks.push('Vitest');
      if (deps['mocha']) techStack.testFrameworks.push('Mocha');
      if (deps['cypress']) techStack.testFrameworks.push('Cypress');
      if (deps['playwright']) techStack.testFrameworks.push('Playwright');
      if (deps['@testing-library/react']) techStack.testFrameworks.push('Testing Library');
      
      // Databases
      if (deps['mongoose'] || deps['mongodb']) techStack.databases.push('MongoDB');
      if (deps['pg'] || deps['postgres']) techStack.databases.push('PostgreSQL');
      if (deps['mysql'] || deps['mysql2']) techStack.databases.push('MySQL');
      if (deps['redis'] || deps['ioredis']) techStack.databases.push('Redis');
      if (deps['prisma'] || deps['@prisma/client']) techStack.databases.push('Prisma');
      if (deps['drizzle-orm']) techStack.databases.push('Drizzle');
      if (deps['better-sqlite3'] || deps['sqlite3']) techStack.databases.push('SQLite');
    } catch (e) {
      console.error('Error parsing package.json:', e);
    }
  }

  // Python detection
  const requirementsTxt = fileContents.get('requirements.txt');
  const pyprojectToml = fileContents.get('pyproject.toml');
  
  if (requirementsTxt || pyprojectToml) {
    const content = requirementsTxt || pyprojectToml || '';
    
    if (content.includes('django')) techStack.frameworks.push('Django');
    if (content.includes('flask')) techStack.frameworks.push('Flask');
    if (content.includes('fastapi')) techStack.frameworks.push('FastAPI');
    if (content.includes('pytest')) techStack.testFrameworks.push('pytest');
    if (content.includes('sqlalchemy')) techStack.databases.push('SQLAlchemy');
    
    techStack.packageManager = techStack.packageManager || (requirementsTxt ? 'pip' : 'poetry');
  }

  // CI/CD detection
  if (files.some(f => f.path.startsWith('.github/workflows/'))) {
    techStack.cicd.push('GitHub Actions');
  }
  if (files.some(f => f.path === '.gitlab-ci.yml')) {
    techStack.cicd.push('GitLab CI');
  }
  if (files.some(f => f.path === 'Jenkinsfile')) {
    techStack.cicd.push('Jenkins');
  }
  if (files.some(f => f.path === '.travis.yml')) {
    techStack.cicd.push('Travis CI');
  }

  // Containerization
  if (files.some(f => f.name === 'Dockerfile')) {
    techStack.containerization.push('Docker');
  }
  if (files.some(f => f.name.startsWith('docker-compose'))) {
    techStack.containerization.push('Docker Compose');
  }
  if (files.some(f => f.path.includes('kubernetes') || f.name.endsWith('.yaml') && f.path.includes('k8s'))) {
    techStack.containerization.push('Kubernetes');
  }

  return techStack;
}
`.trim());

// ============================================================================
// AI INTEGRATION
// ============================================================================

writeFile('src/lib/ai/gemini.ts', `
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

export function getGeminiModel(): GenerativeModel {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
  }
  
  return model;
}

export async function generateAnalysis(prompt: string): Promise<string> {
  const model = getGeminiModel();
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate analysis. Please try again.');
  }
}
`.trim());

writeFile('src/lib/ai/prompts.ts', `
import { TechStack } from '@/types/analysis';
import { GitHubRepo } from '@/types/github';

export function buildAnalysisPrompt(
  repo: GitHubRepo,
  techStack: TechStack,
  fileContents: Map<string, string>
): string {
  const filesContext = Array.from(fileContents.entries())
    .map(([path, content]) => {
      const truncated = content.length > 3000 
        ? content.slice(0, 3000) + '\\n... [truncated]' 
        : content;
      return \`### File: \${path}\\n\\\`\\\`\\\`\\n\${truncated}\\n\\\`\\\`\\\`\`;
    })
    .join('\\n\\n');

  return \`You are an expert code reviewer and software architect. Analyze this GitHub repository and provide a comprehensive report.

## Repository Information
- **Name**: \${repo.fullName}
- **Description**: \${repo.description || 'No description'}
- **Stars**: \${repo.stars} | **Forks**: \${repo.forks}
- **Primary Language**: \${repo.language || 'Unknown'}
- **License**: \${repo.license || 'None'}

## Tech Stack Detected
- **Languages**: \${techStack.languages.map(l => \`\${l.name} (\${l.percentage}%)\`).join(', ')}
- **Frameworks**: \${techStack.frameworks.join(', ') || 'None detected'}
- **Build Tools**: \${techStack.buildTools.join(', ') || 'None detected'}
- **Test Frameworks**: \${techStack.testFrameworks.join(', ') || 'None detected'}
- **CI/CD**: \${techStack.cicd.join(', ') || 'None detected'}
- **Databases**: \${techStack.databases.join(', ') || 'None detected'}

## Source Files
\${filesContext}

## Analysis Instructions
Analyze the code and provide a JSON response with this exact structure:

\\\`\\\`\\\`json
{
  "scores": {
    "overall": <0-100>,
    "codeQuality": <0-100>,
    "security": <0-100>,
    "performance": <0-100>,
    "architecture": <0-100>,
    "documentation": <0-100>,
    "testing": <0-100>
  },
  "findings": [
    {
      "category": "<code-quality|security|performance|architecture|documentation|testing>",
      "severity": "<critical|high|medium|low>",
      "title": "<brief title>",
      "description": "<detailed explanation>",
      "file": "<file path if applicable>",
      "line": <line number if applicable>,
      "code": "<relevant code snippet if applicable>",
      "suggestion": "<specific fix or improvement>",
      "impact": "<what happens if not fixed>"
    }
  ],
  "summary": {
    "executive": "<2-3 sentence summary for non-technical readers>",
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "concerns": ["<concern 1>", "<concern 2>", "<concern 3>"],
    "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
  }
}
\\\`\\\`\\\`

## Scoring Guidelines
- **90-100**: Excellent - Production-ready, follows best practices
- **80-89**: Good - Minor improvements possible
- **70-79**: Fair - Some issues need attention
- **60-69**: Needs Work - Multiple issues to address
- **40-59**: Poor - Significant problems
- **0-39**: Critical - Major refactoring needed

## Finding Categories
1. **Code Quality**: Code smells, naming, duplication, error handling, readability
2. **Security**: Hardcoded secrets, injection risks, auth issues, data exposure
3. **Performance**: N+1 queries, memory issues, inefficient algorithms, bundle size
4. **Architecture**: Structure, separation of concerns, modularity, patterns
5. **Documentation**: README, comments, API docs, type definitions
6. **Testing**: Test coverage, test quality, test organization

Provide at least 5 findings, prioritizing critical and high severity issues.
Be specific with file paths and line numbers when possible.
Make suggestions actionable and concrete.

IMPORTANT: Return ONLY the JSON object, no additional text.\`;
}
`.trim());

// ============================================================================
// ANALYSIS ENGINE
// ============================================================================

writeFile('src/lib/analysis/analyzer.ts', `
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
    
    onProgress?.('parsing', 60, \`Fetching \${filePaths.length} key files...\`);
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
      repoUrl: \`https://github.com/\${owner}/\${repo}\`,
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
        id: \`finding-\${i + 1}\`,
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
  const jsonMatch = response.match(/\\\`\\\`\\\`json\\n?([\\s\\S]*?)\\n?\\\`\\\`\\\`/);
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
`.trim());

// ============================================================================
// DATABASE
// ============================================================================

writeFile('src/lib/db/schema.ts', `
export const CREATE_TABLES_SQL = \`
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
\`;

export interface ReportRow {
  id: string;
  repo_url: string;
  repo_owner: string;
  repo_name: string;
  overall_score: number;
  data: string;
  created_at: string;
}
`.trim());

writeFile('src/lib/db/client.ts', `
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
`.trim());

console.log('\n✓ Core libraries created');

// ============================================================================
// UI COMPONENTS (shadcn/ui style)
// ============================================================================

writeFile('src/components/ui/button.tsx', `
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-primary text-white shadow-lg hover:opacity-90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
`.trim());

writeFile('src/components/ui/card.tsx', `
import * as React from "react";
import { cn } from "@/lib/utils/cn";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
`.trim());

writeFile('src/components/ui/input.tsx', `
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
`.trim());

writeFile('src/components/ui/badge.tsx', `
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        critical: "border-red-500/30 bg-red-500/20 text-red-400",
        high: "border-orange-500/30 bg-orange-500/20 text-orange-400",
        medium: "border-yellow-500/30 bg-yellow-500/20 text-yellow-400",
        low: "border-blue-500/30 bg-blue-500/20 text-blue-400",
        success: "border-green-500/30 bg-green-500/20 text-green-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
`.trim());

writeFile('src/components/ui/progress.tsx', `
"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils/cn";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: \`translateX(-\${100 - (value || 0)}%)\` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
`.trim());

writeFile('src/components/ui/tabs.tsx', `
"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils/cn";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
`.trim());

writeFile('src/components/ui/accordion.tsx', `
"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
`.trim());

writeFile('src/components/ui/separator.tsx', `
"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils/cn";

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
`.trim());

writeFile('src/components/ui/scroll-area.tsx', `
"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils/cn";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
`.trim());

writeFile('src/components/ui/tooltip.tsx', `
"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils/cn";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
`.trim());

writeFile('src/components/ui/skeleton.tsx', `
import { cn } from "@/lib/utils/cn";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  );
}

export { Skeleton };
`.trim());

writeFile('src/components/ui/alert.tsx', `
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        warning:
          "border-yellow-500/50 text-yellow-600 dark:text-yellow-500 [&>svg]:text-yellow-500",
        success:
          "border-green-500/50 text-green-600 dark:text-green-500 [&>svg]:text-green-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
`.trim());

console.log('\\n✓ UI components created');

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

writeFile('src/components/shared/navbar.tsx', `
"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Github, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative">
            <Skull className="h-8 w-8 text-primary" />
            <div className="absolute -inset-1 bg-primary/20 blur-lg rounded-full -z-10" />
          </div>
          <span className="font-bold text-xl">
            Byte<span className="text-primary">Reaper</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/analyze">
            <Button variant="ghost">Analyze</Button>
          </Link>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon">
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Button>
          </a>
        </div>
      </div>
    </nav>
  );
}
`.trim());

writeFile('src/components/shared/footer.tsx', `
import { Skull } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Skull className="h-5 w-5" />
          <span className="text-sm">
            ByteReaper - AI-Powered Code Analysis
          </span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Built with Next.js, Tailwind CSS, and Google Gemini
        </p>
      </div>
    </footer>
  );
}
`.trim());

writeFile('src/components/shared/score-ring.tsx', `
"use client";

import { cn } from "@/lib/utils/cn";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function ScoreRing({ 
  score, 
  size = "md", 
  showLabel = true,
  className 
}: ScoreRingProps) {
  const sizeClasses = {
    sm: "w-16 h-16 text-lg",
    md: "w-24 h-24 text-2xl",
    lg: "w-32 h-32 text-3xl",
  };

  const strokeWidth = size === "sm" ? 4 : size === "md" ? 6 : 8;
  const radius = size === "sm" ? 28 : size === "md" ? 42 : 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return "text-green-500 stroke-green-500";
    if (score >= 60) return "text-yellow-500 stroke-yellow-500";
    if (score >= 40) return "text-orange-500 stroke-orange-500";
    return "text-red-500 stroke-red-500";
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-1000 ease-out", getColor(score))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold", getColor(score).split(" ")[0])}>
          {score}
        </span>
        {showLabel && (
          <span className="text-xs text-muted-foreground">/ 100</span>
        )}
      </div>
    </div>
  );
}
`.trim());

writeFile('src/components/shared/loading-spinner.tsx', `
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <Loader2 
      className={cn(
        "animate-spin text-primary", 
        sizeClasses[size], 
        className
      )} 
    />
  );
}
`.trim());

console.log('\\n✓ Shared components created');

// ============================================================================
// LANDING PAGE COMPONENTS
// ============================================================================

writeFile('src/components/landing/hero.tsx', `
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Skull, Zap, Shield, Code } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl" />
      </div>

      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-block mb-6"
          >
            <div className="relative">
              <Skull className="h-20 w-20 md:h-24 md:w-24 text-primary mx-auto" />
              <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full -z-10" />
            </div>
          </motion.div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
            <span className="text-gradient">ByteReaper</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            AI-powered code analysis that helps you build better software.
            Detect bugs, security issues, and get actionable improvements.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/analyze">
              <Button size="xl" variant="gradient" className="group">
                Analyze Repository
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="xl" variant="outline">
                View on GitHub
              </Button>
            </a>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Free</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">AI</div>
              <div className="text-sm text-muted-foreground">Powered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">5+</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
`.trim());

writeFile('src/components/landing/features.tsx', `
"use client";

import { motion } from "framer-motion";
import { 
  Code, Shield, Zap, Boxes, FileText, TestTube, 
  BarChart, GitBranch, AlertTriangle 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Code,
    title: "Code Quality",
    description: "Detect code smells, naming issues, duplication, and error handling problems.",
  },
  {
    icon: Shield,
    title: "Security Analysis",
    description: "Find hardcoded secrets, injection risks, and authentication vulnerabilities.",
  },
  {
    icon: Zap,
    title: "Performance",
    description: "Identify N+1 queries, memory leaks, and inefficient algorithms.",
  },
  {
    icon: Boxes,
    title: "Architecture",
    description: "Evaluate project structure, separation of concerns, and modularity.",
  },
  {
    icon: FileText,
    title: "Documentation",
    description: "Check README quality, code comments, and API documentation coverage.",
  },
  {
    icon: TestTube,
    title: "Testing",
    description: "Analyze test coverage indicators and testing best practices.",
  },
  {
    icon: BarChart,
    title: "Health Score",
    description: "Get an overall repository health score from 0-100.",
  },
  {
    icon: GitBranch,
    title: "Tech Stack",
    description: "Automatic detection of languages, frameworks, and dependencies.",
  },
  {
    icon: AlertTriangle,
    title: "Priority Ranking",
    description: "Findings ranked by severity: Critical, High, Medium, Low.",
  },
];

export function Features() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comprehensive Code Analysis
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            ByteReaper analyzes your code across multiple dimensions to provide
            actionable insights that help you ship better software.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
`.trim());

writeFile('src/components/landing/how-it-works.tsx', `
"use client";

import { motion } from "framer-motion";
import { Link2, Cpu, FileOutput, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Link2,
    title: "Paste Repository URL",
    description: "Enter any public GitHub repository URL to start the analysis.",
  },
  {
    icon: Cpu,
    title: "AI Analysis",
    description: "Our AI examines your code structure, patterns, and potential issues.",
  },
  {
    icon: FileOutput,
    title: "Get Report",
    description: "Receive a detailed report with prioritized findings and suggestions.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get insights about your code in three simple steps.
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="flex flex-col items-center text-center max-w-xs">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-sm text-primary font-medium mb-2">
                  Step {index + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {step.description}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <ArrowRight className="hidden md:block h-6 w-6 text-muted-foreground mx-4" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
`.trim());

console.log('\\n✓ Landing page components created');

// ============================================================================
// ANALYZE PAGE COMPONENTS
// ============================================================================

writeFile('src/components/analyze/analyze-form.tsx', `
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseGitHubUrl } from "@/lib/utils/helpers";
import { AnalysisProgress } from "./analysis-progress";

export function AnalyzeForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{
    stage: string;
    progress: number;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    setIsAnalyzing(true);
    setProgress({ stage: "fetching", progress: 0, message: "Starting analysis..." });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: parsed.owner, repo: parsed.repo }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      // Redirect to report page
      router.push(\`/report/\${data.id}\`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsAnalyzing(false);
      setProgress(null);
    }
  };

  const exampleRepos = [
    "facebook/react",
    "vercel/next.js",
    "microsoft/vscode",
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Analyze Repository</CardTitle>
        <CardDescription>
          Enter a public GitHub repository URL to start the analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAnalyzing && progress ? (
          <AnalysisProgress {...progress} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="https://github.com/Belal-C101/ByteReaper"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-10"
                  disabled={isAnalyzing}
                />
              </div>
              <Button type="submit" disabled={isAnalyzing || !url}>
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2">Analyze</span>
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                Try these examples:
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleRepos.map((repo) => (
                  <Button
                    key={repo}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUrl(\`https://github.com/\${repo}\`)}
                    disabled={isAnalyzing}
                  >
                    {repo}
                  </Button>
                ))}
              </div>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
`.trim());

writeFile('src/components/analyze/analysis-progress.tsx', `
"use client";

import { motion } from "framer-motion";
import { Loader2, Check, GitBranch, Code, Brain, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalysisProgressProps {
  stage: string;
  progress: number;
  message: string;
}

const stages = [
  { id: "fetching", label: "Fetching Repository", icon: GitBranch },
  { id: "parsing", label: "Parsing Files", icon: Code },
  { id: "analyzing", label: "AI Analysis", icon: Brain },
  { id: "generating", label: "Generating Report", icon: FileText },
];

export function AnalysisProgress({ stage, progress, message }: AnalysisProgressProps) {
  const currentIndex = stages.findIndex((s) => s.id === stage);

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="inline-block"
        >
          <Loader2 className="h-12 w-12 text-primary" />
        </motion.div>
        <p className="mt-4 text-lg font-medium">{message}</p>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="grid grid-cols-4 gap-2">
        {stages.map((s, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = s.icon;

          return (
            <div
              key={s.id}
              className={\`flex flex-col items-center gap-2 p-2 rounded-lg transition-colors \${
                isComplete
                  ? "text-green-500"
                  : isCurrent
                  ? "text-primary"
                  : "text-muted-foreground"
              }\`}
            >
              <div
                className={\`w-10 h-10 rounded-full flex items-center justify-center \${
                  isComplete
                    ? "bg-green-500/20"
                    : isCurrent
                    ? "bg-primary/20"
                    : "bg-muted"
                }\`}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span className="text-xs text-center">{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`.trim());

console.log('\\n✓ Analyze page components created');

// ============================================================================
// REPORT PAGE COMPONENTS
// ============================================================================

writeFile('src/components/report/report-header.tsx', `
"use client";

import { ExternalLink, Star, GitFork, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/shared/score-ring";
import { AnalysisResult } from "@/types/analysis";
import { formatDate, formatNumber, getScoreLabel } from "@/lib/utils/helpers";

interface ReportHeaderProps {
  result: AnalysisResult;
}

export function ReportHeader({ result }: ReportHeaderProps) {
  const { repoInfo, scores, techStack, metadata } = result;

  return (
    <div className="border-b pb-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Score */}
        <div className="flex flex-col items-center">
          <ScoreRing score={scores.overall} size="lg" />
          <span className="mt-2 text-lg font-semibold">
            {getScoreLabel(scores.overall)}
          </span>
        </div>

        {/* Repo Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {repoInfo.owner}/{repoInfo.name}
              </h1>
              {repoInfo.description && (
                <p className="text-muted-foreground mb-4">
                  {repoInfo.description}
                </p>
              )}
            </div>
            <a
              href={result.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View on GitHub
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Star className="h-4 w-4" />
              <span>{formatNumber(repoInfo.stars)} stars</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <GitFork className="h-4 w-4" />
              <span>{formatNumber(repoInfo.forks)} forks</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Analyzed {formatDate(metadata.analyzedAt)}</span>
            </div>
          </div>

          {/* Tech Stack Badges */}
          <div className="flex flex-wrap gap-2">
            {techStack.languages.slice(0, 3).map((lang) => (
              <Badge key={lang.name} variant="secondary">
                {lang.name} ({lang.percentage}%)
              </Badge>
            ))}
            {techStack.frameworks.map((fw) => (
              <Badge key={fw} variant="outline">
                {fw}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
`.trim());

writeFile('src/components/report/score-breakdown.tsx', `
"use client";

import { Code, Shield, Zap, Boxes, FileText, TestTube } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AnalysisScores } from "@/types/analysis";
import { getScoreColor } from "@/lib/utils/helpers";

interface ScoreBreakdownProps {
  scores: AnalysisScores;
}

const scoreCategories = [
  { key: "codeQuality", label: "Code Quality", icon: Code },
  { key: "security", label: "Security", icon: Shield },
  { key: "performance", label: "Performance", icon: Zap },
  { key: "architecture", label: "Architecture", icon: Boxes },
  { key: "documentation", label: "Documentation", icon: FileText },
  { key: "testing", label: "Testing", icon: TestTube },
] as const;

export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scoreCategories.map(({ key, label, icon: Icon }) => {
          const score = scores[key];
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <span className={\`text-sm font-bold \${getScoreColor(score)}\`}>
                  {score}
                </span>
              </div>
              <Progress value={score} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
`.trim());

writeFile('src/components/report/findings-list.tsx', `
"use client";

import { useState } from "react";
import { 
  Code, Shield, Zap, Boxes, FileText, TestTube,
  ChevronDown, ChevronUp, AlertTriangle, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Finding, Severity, FindingCategory } from "@/types/analysis";
import { SEVERITY_COLORS, CATEGORY_LABELS } from "@/lib/utils/constants";

interface FindingsListProps {
  findings: Finding[];
}

const categoryIcons: Record<FindingCategory, typeof Code> = {
  "code-quality": Code,
  security: Shield,
  performance: Zap,
  architecture: Boxes,
  documentation: FileText,
  testing: TestTube,
};

function FindingCard({ finding }: { finding: Finding }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = categoryIcons[finding.category] || AlertTriangle;
  const severityVariant = finding.severity as keyof typeof SEVERITY_COLORS;

  return (
    <Card className="border-l-4" style={{
      borderLeftColor: \`hsl(var(--\${finding.severity}))\`
    }}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <CardTitle className="text-base">{finding.title}</CardTitle>
              {finding.file && (
                <p className="text-sm text-muted-foreground mt-1">
                  {finding.file}
                  {finding.line && \`:$\{finding.line}\`}
                </p>
              )}
            </div>
          </div>
          <Badge variant={severityVariant}>
            {finding.severity.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          {finding.description}
        </p>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between"
        >
          {isExpanded ? "Show less" : "Show details"}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {isExpanded && (
          <div className="mt-4 space-y-4">
            {finding.code && (
              <div>
                <h4 className="text-sm font-medium mb-2">Code</h4>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                  <code>{finding.code}</code>
                </pre>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Suggestion
              </h4>
              <p className="text-sm text-muted-foreground">
                {finding.suggestion}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Impact
              </h4>
              <p className="text-sm text-muted-foreground">
                {finding.impact}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FindingsList({ findings }: FindingsListProps) {
  const severities: Severity[] = ["critical", "high", "medium", "low"];
  const categories = Object.keys(CATEGORY_LABELS) as FindingCategory[];

  const findingsBySeverity = severities.reduce((acc, severity) => {
    acc[severity] = findings.filter((f) => f.severity === severity);
    return acc;
  }, {} as Record<Severity, Finding[]>);

  const findingsByCategory = categories.reduce((acc, category) => {
    acc[category] = findings.filter((f) => f.category === category);
    return acc;
  }, {} as Record<FindingCategory, Finding[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Findings ({findings.length})</span>
          <div className="flex gap-2">
            {severities.map((severity) => (
              <Badge key={severity} variant={severity as any}>
                {findingsBySeverity[severity].length}
              </Badge>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="severity">By Severity</TabsTrigger>
            <TabsTrigger value="category">By Category</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {findings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No findings detected. Great job! 🎉
              </p>
            ) : (
              findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))
            )}
          </TabsContent>

          <TabsContent value="severity" className="space-y-6">
            {severities.map((severity) => (
              <div key={severity}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge variant={severity as any}>
                    {severity.toUpperCase()}
                  </Badge>
                  <span>({findingsBySeverity[severity].length})</span>
                </h3>
                <div className="space-y-4">
                  {findingsBySeverity[severity].length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No {severity} severity findings.
                    </p>
                  ) : (
                    findingsBySeverity[severity].map((finding) => (
                      <FindingCard key={finding.id} finding={finding} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="category" className="space-y-6">
            {categories.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {CATEGORY_LABELS[category]}
                    <span className="text-muted-foreground">
                      ({findingsByCategory[category].length})
                    </span>
                  </h3>
                  <div className="space-y-4">
                    {findingsByCategory[category].length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No findings in this category.
                      </p>
                    ) : (
                      findingsByCategory[category].map((finding) => (
                        <FindingCard key={finding.id} finding={finding} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
`.trim());

writeFile('src/components/report/summary-card.tsx', `
"use client";

import { CheckCircle, AlertCircle, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisResult } from "@/types/analysis";

interface SummaryCardProps {
  summary: AnalysisResult["summary"];
}

export function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Executive Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground">{summary.executive}</p>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Strengths */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-green-500">
              <CheckCircle className="h-4 w-4" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {summary.strengths.map((strength, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  • {strength}
                </li>
              ))}
            </ul>
          </div>

          {/* Concerns */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-orange-500">
              <AlertCircle className="h-4 w-4" />
              Concerns
            </h4>
            <ul className="space-y-1">
              {summary.concerns.map((concern, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  • {concern}
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-blue-500">
              <Lightbulb className="h-4 w-4" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {summary.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
`.trim());

writeFile('src/components/report/tech-stack-card.tsx', `
"use client";

import { 
  Code, Package, Hammer, TestTube, Workflow, 
  Database, Box, FolderGit 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TechStack } from "@/types/analysis";

interface TechStackCardProps {
  techStack: TechStack;
}

export function TechStackCard({ techStack }: TechStackCardProps) {
  const sections = [
    { 
      icon: Package, 
      title: "Package Manager", 
      items: techStack.packageManager ? [techStack.packageManager] : [] 
    },
    { icon: Box, title: "Frameworks", items: techStack.frameworks },
    { icon: Hammer, title: "Build Tools", items: techStack.buildTools },
    { icon: TestTube, title: "Test Frameworks", items: techStack.testFrameworks },
    { icon: Workflow, title: "CI/CD", items: techStack.cicd },
    { icon: Database, title: "Databases", items: techStack.databases },
    { icon: FolderGit, title: "Containerization", items: techStack.containerization },
  ].filter(s => s.items.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Tech Stack
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Languages */}
        <div>
          <h4 className="text-sm font-medium mb-3">Languages</h4>
          <div className="space-y-2">
            {techStack.languages.map((lang) => (
              <div key={lang.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{lang.name}</span>
                  <span className="text-muted-foreground">{lang.percentage}%</span>
                </div>
                <Progress value={lang.percentage} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Other sections */}
        {sections.map(({ icon: Icon, title, items }) => (
          <div key={title}>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {title}
            </h4>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
`.trim());

console.log('\\n✓ Report page components created');

// ============================================================================
// API ROUTES
// ============================================================================

writeFile('src/app/api/analyze/route.ts', `
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
`.trim());

writeFile('src/app/api/report/[id]/route.ts', `
import { NextRequest, NextResponse } from "next/server";
import { getReport } from "@/lib/db/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = getReport(id);

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}
`.trim());

writeFile('src/app/api/health/route.ts', `
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
}
`.trim());

console.log('\\n✓ API routes created');

// ============================================================================
// PAGES
// ============================================================================

writeFile('src/app/page.tsx', `
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
    </>
  );
}
`.trim());

writeFile('src/app/globals.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 262 83% 58%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 262 83% 58%;
    --radius: 0.75rem;
    --critical: 0 84% 60%;
    --critical-foreground: 0 0% 100%;
    --high: 25 95% 53%;
    --high-foreground: 0 0% 100%;
    --medium: 45 93% 47%;
    --medium-foreground: 0 0% 0%;
    --low: 217 91% 60%;
    --low-foreground: 0 0% 100%;
    --success: 142 76% 36%;
    --success-foreground: 0 0% 100%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 6%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 6%;
    --popover-foreground: 210 40% 98%;
    --primary: 262 83% 58%;
    --primary-foreground: 210 40% 98%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 50.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 262 83% 58%;
    --critical: 0 72% 51%;
    --critical-foreground: 0 0% 100%;
    --high: 25 95% 53%;
    --high-foreground: 0 0% 100%;
    --medium: 45 93% 47%;
    --medium-foreground: 0 0% 0%;
    --low: 217 91% 60%;
    --low-foreground: 0 0% 100%;
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@layer utilities {
  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500;
  }
  .bg-gradient-primary {
    @apply bg-gradient-to-r from-purple-600 via-violet-600 to-pink-600;
  }
}

.dark ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.dark ::-webkit-scrollbar-track {
  background: hsl(222.2 84% 6%);
}
.dark ::-webkit-scrollbar-thumb {
  background: hsl(217.2 32.6% 25%);
  border-radius: 5px;
}
`.trim());

writeFile('src/app/layout.tsx', `
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ByteReaper - AI Code Analysis Agent",
  description: "Analyze your GitHub repositories with AI. Get actionable insights on code quality, security, performance, and architecture.",
  keywords: ["code analysis", "github", "AI", "code review", "security", "performance"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
`.trim());

writeFile('src/app/analyze/page.tsx', `
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
`.trim());

writeFile('src/app/report/[id]/page.tsx', `
import { notFound } from "next/navigation";
import { getReport } from "@/lib/db/client";
import { ReportHeader } from "@/components/report/report-header";
import { SummaryCard } from "@/components/report/summary-card";
import { ScoreBreakdown } from "@/components/report/score-breakdown";
import { TechStackCard } from "@/components/report/tech-stack-card";
import { FindingsList } from "@/components/report/findings-list";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const report = getReport(id);

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
`.trim());

writeFile('src/app/not-found.tsx', `
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skull } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Skull className="h-24 w-24 text-muted-foreground mb-6" />
      <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you're looking for doesn't exist or the report has been removed.
      </p>
      <Link href="/">
        <Button>Go Home</Button>
      </Link>
    </div>
  );
}
`.trim());

writeFile('src/components/providers/theme-provider.tsx', `
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
`.trim());

console.log('\\n✓ Pages created');

// ============================================================================
// FINAL SETUP
// ============================================================================

console.log('\\n========================================');
console.log('✅ ByteReaper source code generated!');
console.log('========================================');
console.log('\\nNext steps:');
console.log('1. Run: node setup-dirs.js');
console.log('2. Run: npm install');
console.log('3. Add GEMINI_API_KEY to .env.local');
console.log('4. Run: npm run dev');
console.log('5. Open: http://localhost:3000');
console.log('');

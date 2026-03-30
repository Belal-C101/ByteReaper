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
        ? content.slice(0, 3000) + '\n... [truncated]' 
        : content;
      return `### File: ${path}\n\`\`\`\n${truncated}\n\`\`\``;
    })
    .join('\n\n');

  return `You are an expert code reviewer and software architect. Analyze this GitHub repository and provide a comprehensive report.

## Repository Information
- **Name**: ${repo.fullName}
- **Description**: ${repo.description || 'No description'}
- **Stars**: ${repo.stars} | **Forks**: ${repo.forks}
- **Primary Language**: ${repo.language || 'Unknown'}
- **License**: ${repo.license || 'None'}

## Tech Stack Detected
- **Languages**: ${techStack.languages.map(l => `${l.name} (${l.percentage}%)`).join(', ')}
- **Frameworks**: ${techStack.frameworks.join(', ') || 'None detected'}
- **Build Tools**: ${techStack.buildTools.join(', ') || 'None detected'}
- **Test Frameworks**: ${techStack.testFrameworks.join(', ') || 'None detected'}
- **CI/CD**: ${techStack.cicd.join(', ') || 'None detected'}
- **Databases**: ${techStack.databases.join(', ') || 'None detected'}

## Source Files
${filesContext}

## Analysis Instructions
Analyze the code and provide a JSON response with this exact structure:

\`\`\`json
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
\`\`\`

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

IMPORTANT: Return ONLY the JSON object, no additional text.`;
}
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
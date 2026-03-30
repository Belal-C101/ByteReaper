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
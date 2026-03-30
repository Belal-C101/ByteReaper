import { getOctokit } from './client';
import { GitHubRepo, GitHubFile } from '@/types/github';

export async function fetchRepository(owner: string, repo: string): Promise<GitHubRepo> {
  const octokit = getOctokit();
  
  try {
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
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error(`Repository ${owner}/${repo} not found. Make sure it exists and is public.`);
    }
    if (error.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later or add a GITHUB_TOKEN.');
    }
    throw error;
  }
}

export async function fetchRepositoryTree(
  owner: string,
  repo: string,
  branch: string
): Promise<GitHubFile[]> {
  const octokit = getOctokit();
  
  try {
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
  } catch (error: any) {
    console.error('Error fetching tree:', error);
    throw new Error(`Failed to fetch repository structure: ${error.message}`);
  }
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
    // Silent fail for individual files - they may be too large or binary
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
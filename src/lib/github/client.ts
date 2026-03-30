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
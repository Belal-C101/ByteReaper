export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Clean up the URL
  let cleaned = url.trim()
    .replace(/\/+$/, '')  // Remove trailing slashes
    .replace(/^(https?:\/\/)?(www\.)?/, ''); // Remove protocol and www

  // Handle URLs with tree/branch paths like github.com/owner/repo/tree/main/folder
  cleaned = cleaned.replace(/\/tree\/[^\/]+.*$/, '');
  cleaned = cleaned.replace(/\/blob\/[^\/]+.*$/, '');
  cleaned = cleaned.replace(/\/pull\/\d+.*$/, '');
  cleaned = cleaned.replace(/\/issues\/\d+.*$/, '');
  cleaned = cleaned.replace(/\/commits?\/.*$/, '');
  
  const patterns = [
    // github.com/owner/repo
    /^github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/,
    // git@github.com:owner/repo
    /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
    // owner/repo
    /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, '');
      // Validate - owner and repo should be valid GitHub names
      if (owner && repo && !owner.includes('.') && owner.length <= 39 && repo.length <= 100) {
        return { owner, repo };
      }
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
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
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  imageLinks?: UploadedMediaLink[];
  fileLinks?: UploadedMediaLink[];
  searchResults?: SearchResult[];
  isStreaming?: boolean;
  error?: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
  preview?: string;
  cloudinaryUrl?: string;
}

export interface UploadedMediaLink {
  url: string;
  name: string;
  provider?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface AgentTool {
  name: 'search' | 'analyze_repo' | 'analyze_code' | 'explain';
  description: string;
  parameters?: Record<string, any>;
}

export interface ConversationState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentTool?: AgentTool['name'];
  error?: string;
}
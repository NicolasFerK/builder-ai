export type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  lastModified: number;
  chatHistory: ChatMessage[];
  files: FileNode[];
  aiContext?: string;
  sessionSummary?: string;
  currentTask?: CurrentTask;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export type FileNode = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
};

export type CurrentTask = {
  id: string;
  title: string;
  description: string;
  objective: string;
  files: string[]; // relevant files
  constraints: string;
  status: 'pending' | 'in_progress' | 'completed';
};

export type AISettings = {
  apiUrl: string;
  apiKey?: string;
  modelName?: string;
  theme?: 'light' | 'dark';
  viewMode?: 'desktop' | 'mobile';
};

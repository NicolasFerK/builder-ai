export type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  lastModified: number;
  chatHistory: ChatMessage[];
  files: FileNode[];
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

export type AISettings = {
  apiUrl: string;
  apiKey?: string;
  modelName?: string;
  theme?: 'light' | 'dark';
};

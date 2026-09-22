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
};

// --- ERP Types ---

export type MaterialCategory = 'Raw Material' | 'Component' | 'Finished Good' | 'Consumable' | 'Tooling';

export type UnitOfMeasure = 'kg' | 'un' | 'm' | 'l' | 'box' | 'set';

export type MovementType = 'IN' | 'OUT';

export type Material = {
  id: string;
  sku: string;
  name: string;
  category: MaterialCategory;
  quantity: number;
  minStock: number;
  unit: UnitOfMeasure;
};

export type Movement = {
  id: string;
  materialId: string;
  type: MovementType;
  quantity: number;
  timestamp: number;
  observation?: string;
};

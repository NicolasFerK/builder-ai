import { FileNode } from '../types';

export interface ExtractedCode {
  path: string;
  language: string;
  content: string;
}

export function parseCodeBlocks(text: string): ExtractedCode[] {
  const codeBlocks: ExtractedCode[] = [];
  const regex = /```(\w+)?\s*\n([\s\S]*?)\n```/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const language = match[1] || 'text';
    const content = match[2];
    const lines = content.split('\n');
    const firstLine = lines[0].trim();
    const pathMatch = firstLine.match(/^(?:\/\/\s*|\/\*\s*)([\w\/\.\-]+\.\w+)(?:\s*\*\/|\s*\/*)/);
    let path = '';
    let actualContent = content;
    if (pathMatch && pathMatch[1]) {
      path = pathMatch[1];
      actualContent = lines.slice(1).join('\n');
    } else {
      if (language === 'html') path = 'index.html';
      else if (language === 'css') path = 'src/index.css';
      else if (language === 'javascript' || language === 'js') path = 'src/index.js';
      else if (language === 'typescript' || language === 'ts') path = 'src/index.ts';
      else if (language === 'tsx') path = 'src/App.tsx';
      else path = 'README.md';
    }
    codeBlocks.push({ path, language, content: actualContent.trim() });
  }
  return codeBlocks;
}

export function updateFileInTree(nodes: FileNode[], targetPath: string, content: string): FileNode[] {
  const pathParts = targetPath.split('/').filter(p => p.length > 0);
  if (pathParts.length === 0) return nodes;
  const newNodes = [...nodes];
  function upsert(currentNodes: FileNode[], parts: string[]): FileNode[] {
    const [currentPart, ...remainingParts] = parts;
    const isLast = remainingParts.length === 0;
    const existingIndex = currentNodes.findIndex(n => n.name === currentPart);
    if (isLast) {
      if (existingIndex !== -1) {
        currentNodes[existingIndex] = { ...currentNodes[existingIndex], content };
      } else {
        currentNodes.push({ id: crypto.randomUUID(), name: currentPart, type: 'file', content });
      }
      return currentNodes;
    }
    if (existingIndex !== -1 && currentNodes[existingIndex].type === 'folder') {
      currentNodes[existingIndex].children = upsert(currentNodes[existingIndex].children || [], remainingParts);
    } else {
      const newFolder: FileNode = { id: crypto.randomUUID(), name: currentPart, type: 'folder', children: [] };
      if (existingIndex !== -1) currentNodes[existingIndex] = newFolder;
      else currentNodes.push(newFolder);
      upsert(newFolder.children!, remainingParts);
    }
    return currentNodes;
  }
  return upsert(newNodes, pathParts);
}

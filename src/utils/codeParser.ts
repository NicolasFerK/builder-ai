import { FileNode } from '../types';

export interface ExtractedCode {
  path: string;
  language: string;
  content: string;
}

export function parseCodeBlocks(text: string): ExtractedCode[] {
  console.log('[APPLY] raw AI response:', text);
  const extracted: ExtractedCode[] = [];

  // 1. Try to parse as JSON first (Format 4)
  try {
    // Find JSON block if it's wrapped in markdown, otherwise try whole text
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\[\s*\{.*\}\s*\]/s);
    if (jsonMatch) {
      const jsonContent = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonContent.trim());
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.path && item.content) {
            extracted.push({
              path: item.path,
              language: item.language || 'text',
              content: item.content
            });
          }
        }
        if (extracted.length > 0) {
          console.log('[APPLY] parsed as JSON format', extracted.length, 'files');
          return extracted;
        }
      }
    }
  } catch (e) {
    console.log('[APPLY] JSON parsing failed, trying other formats');
  }

  // 2. Try to parse markdown code blocks and their preceding file declarations (Formats 1, 2, 3)
  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)\n```/g;
  let match;
  let lastIndex = 0;
  
  const blocks: { index: number, language: string, content: string, preContent: string }[] = [];
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1] || 'text';
    const content = match[2];
    const preContent = text.substring(lastIndex, match.index);
    
    blocks.push({
      index: match.index,
      language,
      content,
      preContent
    });
    
    lastIndex = codeBlockRegex.lastIndex;
  }

  const extractedMap = new Map<string, ExtractedCode>();

  for (const block of blocks) {
    let path = '';
    let content = block.content;

    // Try to find path in preContent (Formats 2 and 3)
    // Format 2: FILE: src/App.tsx
    // Format 3: src/App.tsx
    const preContentTrimmed = block.preContent.trim();
    if (preContentTrimmed) {
      // Match "FILE: path/to/file" or just "path/to/file" at the end of the preContent
      const fileDeclarationRegex = /(?:FILE:\s*|)([a-zA-Z0-9._/\-]+\.[a-zA-Z0-9]+)$/m;
      const preMatch = preContentTrimmed.match(fileDeclarationRegex);
      if (preMatch) {
        path = preMatch[1];
        console.log('[APPLY] path found in preContent:', path);
      }
    }

    // Format 1: Path in comment inside the content (// src/App.tsx)
    if (!path) {
      const lines = content.split('\n');
      const firstLine = lines[0].trim();
      const pathMatch = firstLine.match(/^(?:\/\/ \s*|\/\*\s*)([\w\/\.\-]+\.\w+)(?:\s*\*\/|\s*\/\*)/);
      
      if (pathMatch && pathMatch[1]) {
        path = pathMatch[1];
        content = lines.slice(1).join('\n');
        console.log('[APPLY] path found via comment inside block:', path);
      }
    }

    // If no path was found, discard the block and log
    if (!path) {
      console.log('[APPLY] no path found, discarding block:', block.language);
      continue;
    }

    const trimmedContent = content.trim();
    const existing = extractedMap.get(path);

    if (existing) {
      // If we already have this path, we only update if the new content is not empty.
      // This ignores empty blocks that follow non-empty ones.
      // If an empty block was first, the non-empty one will replace it.
      if (trimmedContent !== '') {
        extractedMap.set(path, {
          path,
          language: block.language,
          content: trimmedContent
        });
      }
    } else {
      extractedMap.set(path, {
        path,
        language: block.language,
        content: trimmedContent
      });
    }
  }

  // Clear extracted and fill from map to maintain the original return type/structure
  extracted.length = 0;
  extractedMap.forEach(val => extracted.push(val));

  console.log('[APPLY] total extracted files:', extracted.length);
  console.log('[APPLY] extracted file paths:', extracted.map(e => e.path));
  return extracted;
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

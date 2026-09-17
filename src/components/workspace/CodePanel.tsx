import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FileNode } from '@/types';

interface CodePanelProps {
  files: FileNode[] | undefined;
  onFileSelect: (file: FileNode) => void;
  selectedFile: FileNode | null;
}

export function CodePanel({ files, onFileSelect, selectedFile }: CodePanelProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const renderTree = (nodes: FileNode[] | undefined, depth = 0) => {
    if (!nodes) return null;
    return nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.id);
      const isSelected = selectedFile?.id === node.id;

      return (
        <div key={node.id}>
          <div
            className={cn(
              "flex items-center gap-1 py-1 px-2 cursor-pointer text-sm rounded-sm transition-colors",
              isSelected ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
              if (node.type === 'folder') {
                toggleFolder(node.id);
              } else {
                onFileSelect(node);
              }
            }}
          >
            {node.type === 'folder' ? (
              <>
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <span className="text-primary">📁</span>
              </>
            ) : (
              <>
                <div className="w-3" /> 
                <span className="text-primary">📄</span>
              </>
            )}
            <span className="truncate">{node.name}</span>
          </div >
          {node.type === 'folder' && isExpanded && node.children && (
            <div >{renderTree(node.children, depth + 1)}</div >
          )}
        </div >
      );
    });
  };

  return (
    <div className="flex h-full bg-card overflow-hidden">
      <div className="w-64 border-r shrink-0 flex flex-col">
        <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
          Explorer
        </div >
        <ScrollArea className="flex-1">
          <div className="py-2">
            {renderTree(files)}
          </div >
        </ScrollArea>
      </div >
      
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="p-2 border-b flex items-center justify-between bg-muted/50">
           <div className="text-xs text-muted-foreground px-2">
             {selectedFile ? selectedFile.name : 'No file selected'}
           </div >
        </div >
        <div className="flex-1 overflow-auto p-4 font-mono text-sm">
          <pre className="text-foreground">
            {selectedFile ? (
              <code >{selectedFile.content}</code>
            ) : (
              <span className="text-muted-foreground italic">Select a file to view its content...</span>
            )}
          </pre>
        </div >
      </div >
    </div >
  );
}

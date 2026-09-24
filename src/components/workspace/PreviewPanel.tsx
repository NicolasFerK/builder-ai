import React, { useState } from 'react';
import { Monitor, Smartphone, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { FileNode } from '@/types';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';

interface PreviewPanelProps {
  files: FileNode[];
}

export function PreviewPanel({ files }: PreviewPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [isReloading, setIsReloading] = useState(false);

  // Helper to find a file by name in the FileNode tree
  const findFileByName = (nodes: FileNode[], name: string): FileNode | undefined => {
    for (const node of nodes) {
      if (node.name === name && node.type === 'file') {
        return node;
      }
      if (node.type === 'folder' && node.children) {
        const found = findFileByName(node.children, name);
        if (found) return found;
      }
    }
    return undefined;
  };

  // Helper to flatten FileNode tree to Sandpack format
  const flattenFiles = (nodes: FileNode[], currentPath: string = "", skipName?: string): Record<string, { code: string }> => {
    const result: Record<string, { code: string }> = {};
    for (const node of nodes) {
      if (node.name === skipName) continue;

      // Sandpack paths usually start with /
      const newPath = currentPath === "" ? `/${node.name}` : `${currentPath}/${node.name}`;
      if (node.type === 'file') {
        result[newPath] = { code: node.content || "" };
      } else if (node.type === 'folder' && node.children) {
        Object.assign(result, flattenFiles(node.children, newPath, skipName));
      }
    }
    return result;
  };

  // Extract dependencies from package.json
  const { dependencies, devDependencies } = React.useMemo(() => {
    const packageJsonNode = findFileByName(files, 'package.json');
    if (packageJsonNode && packageJsonNode.content) {
      try {
        const packageJson = JSON.parse(packageJsonNode.content);
        const dependencies = packageJson.dependencies || {};
        const devDependencies = packageJson.devDependencies || {};

        const filteredDevDependencies = Object.fromEntries(
          Object.entries(devDependencies).filter(([pkg]) =>
            pkg !== 'vite' &&
            !pkg.startsWith('@vitejs/plugin-react') &&
            !pkg.startsWith('@types/')
          )
        );

        return {
          dependencies: dependencies as Record<string, string>,
          devDependencies: filteredDevDependencies as Record<string, string>,
        };
      } catch (error) {
        console.error('Failed to parse package.json', error);
      }
    }
    return {
      dependencies: { 'react': 'latest', 'react-dom': 'latest' },
      devDependencies: {}
    };
  }, [files]);

  const sandpackFiles = React.useMemo(() => flattenFiles(files, "", "package.json"), [files]);

  const handleReload = () => {
    setIsReloading(true);
    // Sandpack handles its own refreshing, but we can provide a visual cue
    setTimeout(() => setIsReloading(false), 500);
  };

  if (files.length === 0) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        Nenhum arquivo para pré-visualizar.
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full bg-muted/30'>
      <div className='p-2 border-b flex items-center justify-between bg-background'>
        <div className='flex items-center gap-2'>
          <span className='text-xs font-medium text-muted-foreground px-2'>Preview</span>
        </div>
        <div className='flex items-center gap-1 bg-muted p-1 rounded-lg'>
          <Button 
            variant={settings.viewMode === 'desktop' ? 'secondary' : 'ghost'} 
            size='icon' 
            className='h-7 w-7'
            onClick={() => updateSettings({ viewMode: 'desktop' })}
          >
            <Monitor className='w-4 h-4' />
          </Button>
          <Button 
            variant={settings.viewMode === 'mobile' ? 'secondary' : 'ghost'} 
            size='icon' 
            className='h-7 w-7'
            onClick={() => updateSettings({ viewMode: 'mobile' })}
          >
            <Smartphone className='w-4 h-4' />
          </Button>
          <div className='w-px h-4 bg-muted-foreground/20 mx-1' />
          <Button 
            variant='ghost' 
            size='icon' 
            className='h-7 w-7'
            onClick={handleReload}
            disabled={isReloading}
          >
            {isReloading ? <Loader2 className='w-4 h-4 animate-spin' /> : <RefreshCw className='w-4 h-4' />}
          </Button>
        </div>
      </div>
      
      <div className='flex-1 flex items-center justify-center p-4 bg-slate-100 overflow-hidden relative'>
        <div className={`shadow-2xl rounded-lg overflow-hidden bg-white transition-all duration-300 ${
          settings.viewMode === 'mobile' 
            ? 'w-[375px] h-[667px]' 
            : 'w-full h-full max-w-5xl'
        }`}>
          <SandpackProvider
            template="vite-react"
            files={sandpackFiles}
            customSetup={{ dependencies, devDependencies }}
            style={{ height: '100%', width: '100%' }}
          >
            <SandpackPreview
              showOpenInCodeSandbox={false}
              showRefreshButton
              style={{ height: '100%', width: '100%' }}
            />
          </SandpackProvider>
        </div>
      </div>
    </div>
  );
}

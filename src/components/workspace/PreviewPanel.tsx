import React, { useState, useEffect, useMemo } from 'react';
import { Monitor, Smartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { FileNode } from '@/types';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';

interface PreviewPanelProps {
  projectId: string;
  files: FileNode[];
}

export function PreviewPanel({ files: projectFiles }: PreviewPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [packageJson, setPackageJson] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch('/package.json')
      .then(res => res.json())
      .then(data => setPackageJson(data))
      .catch(err => console.error('[PREVIEW] Failed to fetch package.json:', err));
  }, []);

  const sandpackFiles = useMemo(() => {
    const buildFiles = (nodes: FileNode[], currentPath = ""): Record<string, string> => {
      let files: Record<string, string> = {};
      for (const node of nodes) {
        const path = `${currentPath}/${node.name}`;
        if (node.type === 'file' && node.content) {
          files[path] = node.content;
        } else if (node.type === 'folder' && node.children) {
          Object.assign(files, buildFiles(node.children, path));
        }
      }
      return files;
    };

    return buildFiles(projectFiles);
  }, [projectFiles]);

  const customSetup = useMemo(() => {
    if (!packageJson) return undefined;

    const dependencies = { ...packageJson.dependencies };
    const devDependencies = { ...packageJson.devDependencies };

    // Filter devDependencies
    Object.keys(devDependencies).forEach(key => {
      if (
        key === 'vite' || 
        key === '@vitejs/plugin-react-swc' || 
        key.startsWith('@vitejs/plugin-react') || 
        key.startsWith('@types/')
      ) {
        delete devDependencies[key];
      }
    });

    return {
      dependencies: {
        ...dependencies,
        ...devDependencies
      }
    };
  }, [packageJson]);

  // Fallback dependencies if package.json is not loaded
  const fallbackSetup = useMemo(() => ({
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0'
    }
  }), []);

  if (projectFiles.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-muted-foreground gap-4'>
        <RefreshCw className='w-12 h-12 opacity-20' />
        <p>Nenhum arquivo para pré-visualizar.</p>
      </div >
    );
  }

  return (
    <div className='flex flex-col h-full bg-muted/30'>
      <div className='p-2 border-b flex items-center justify-between bg-background'>
        <div className='flex items-center gap-2'>
          <span className='text-xs font-medium text-muted-foreground px-2'>Preview</span >
        </div >
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
            onClick={() => setRefreshKey(prev => prev + 1)}
          >
            <RefreshCw className='w-4 h-4' />
          </Button>
        </div >
      </div >
      
      <div className='flex-1 flex items-center justify-center p-4 bg-slate-100 overflow-hidden relative'>
        <div className={`shadow-2xl rounded-lg overflow-hidden bg-white transition-all duration-300 ${
          settings.viewMode === 'mobile' 
            ? 'w-[375px] h-[667px]' 
            : 'w-full h-full max-w-5xl'
        }`}>
          <SandpackProvider
            key={refreshKey}
            template="vite-react"
            files={sandpackFiles}
            customSetup={packageJson ? customSetup : fallbackSetup}
            style={{ height: '100%', width: '100%' }}
          >
            <SandpackPreview
              showOpenInCodeSandbox={false}
              showRefreshButton={true}
              style={{ height: '100%', width: '100%' }}
            />
          </SandpackProvider>
        </div >
      </div >
    </div >
  );
}

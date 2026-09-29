import React, { useState, useMemo } from 'react';
import { Monitor, Smartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { FileNode } from '@/types';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';

interface PreviewPanelProps {
  projectId: string;
  files: FileNode[];
}

export function PreviewPanel({ files }: PreviewPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [refreshKey, setRefreshKey] = useState(0);

  const { sandpackFiles, customSetup } = useMemo(() => {
    const sandpackFiles: Record<string, string> = {};
    let projectPackageJson: any = null;

    const traverse = (nodes: any[], path: string): void => {
      for (const node of nodes) {
        const currentPath = `${path}/${node.name}`;
        if (node.type === 'file' && typeof node.content === 'string') {
          const content = node.content;
          if (node.name === 'package.json') {
            try {
              projectPackageJson = JSON.parse(content);
            } catch (err: any) {
              console.error('[SANDPACK] Failed to parse package.json', err);
            }
          } else {
            sandpackFiles[currentPath] = content;
          }
        } else if (node.type === 'folder' && node.children) {
          traverse(node.children, currentPath);
        }
      }
    };

    traverse(files, '');

    let dependencies: Record<string, string> = { react: '^18.2.0', 'react-dom': '^18.2.0' };
    let devDependencies: Record<string, string> = {};

    if (projectPackageJson) {
      dependencies = projectPackageJson.dependencies || { react: '^18.2.0', 'react-dom': '^18.2.0' };
      const rawDevDeps = projectPackageJson.devDependencies || {};
      
      for (const [pkg, version] of Object.entries(rawDevDeps)) {
        const isVite = pkg === 'vite' || pkg === '@vitejs/plugin-react';
        const isType = pkg.startsWith('@types/');
        if (!isVite && !isType) {
          devDependencies[pkg] = version as string;
        }
      }
    }

    return {
      sandpackFiles,
      customSetup: {
        dependencies,
        devDependencies,
      }
    };
  }, [files]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const hasFiles = Object.keys(sandpackFiles).length > 0;

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
            onClick={handleRefresh}
          >
            <RefreshCw className='h-4 w-4' />
          </Button>
        </div >
      </div >
      
      <div className='flex-1 flex items-center justify-center p-4 bg-slate-100 overflow-hidden relative'>
        <div className={`shadow-2xl rounded-lg overflow-hidden bg-white transition-all duration-300 ${
          settings.viewMode === 'mobile' 
            ? 'w-[375px] h-[667px]' 
            : 'w-full h-full max-w-5xl'
        }`}>
          {!hasFiles ? (
            <div className='w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-4'>
              <RefreshCw className='w-12 h-12 opacity-20' />
              <p>Nenhum arquivo para pré-visualizar.</p>
            </div >
          ) : (
            <SandpackProvider
              key={refreshKey}
              template="vite-react"
              files={sandpackFiles}
              customSetup={customSetup}
              style={{ height: '100%', width: '100%' }}
            >
              <SandpackPreview 
                showOpenInCodeSandbox={false} 
                showRefreshButton 
                style={{ height: '100%', width: '100%' }} 
              />
            </SandpackProvider>
          )}
        </div >
      </div >
    </div >
  );
}

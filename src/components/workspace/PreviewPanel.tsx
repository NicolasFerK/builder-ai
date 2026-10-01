import React, { useMemo } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { FileNode } from '@/types';
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";

interface PreviewPanelProps {
  projectId: string;
  files: FileNode[];
}

/**
 * Flattens a FileNode tree into a flat object of file paths and contents.
 */
function flattenFiles(nodes: FileNode[], base: string = ""): Record<string, string> {
  let flat: Record<string, string> = {};
  for (const node of nodes) {
    const path = base + (base ? "/" : "") + node.name;
    if (node.type === 'file') {
      if (node.content !== undefined) {
        flat[path] = node.content;
      }
    } else if (node.type === 'folder' && node.children) {
      Object.assign(flat, flattenFiles(node.children, path));
    }
  }
  return flat;
}

export function PreviewPanel({ projectId, files }: PreviewPanelProps) {
  const { settings, updateSettings } = useSettings();

  // Prepare Sandpack files: flatten the tree and remove the package.json from the files object
  // as its dependencies will be handled in customSetup.
  const sandpackFiles = useMemo(() => {
    const flat = flattenFiles(files);
    delete flat['package.json'];
    return flat;
  }, [files]);

  // Prepare Sandpack customSetup: extract dependencies from package.json in the files list
  const sandpackCustomSetup = useMemo(() => {
    // We search for the package.json node in the original files array
    // Since the files might be a tree, we need a helper to find it or just flatten and look.
    // Let's use a simpler approach: flatten everything and look for package.json.
    const allFiles = flattenFiles(files);
    const pkgContent = allFiles['package.json'];

    if (pkgContent) {
      try {
        const pkg = JSON.parse(pkgContent);
        const dependencies = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };

        // Remove vite, @vitejs/plugin-react, and any @types packages from the dependency list
        Object.keys(dependencies).forEach((dep) => {
          if (
            dep.includes('vite') || 
            dep.includes('@vitejs/plugin-react') || 
            dep.includes('@types/')
          ) {
            delete dependencies[dep];
          }
        });

        return {
          dependencies,
        };
      } catch (error) {
        console.error('[PREVIEW] Failed to parse package.json for Sandpack setup:', error);
      }
    }
    return {};
  }, [files]);

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
            customSetup={sandpackCustomSetup}
            style={{ height: '100%', width: '100%' }}
          >
            <SandpackPreview 
              showOpenInCodeSandbox={false} 
              showRefreshButton 
            />
          </SandpackProvider>
        </div>
      </div>
    </div>
  );
}

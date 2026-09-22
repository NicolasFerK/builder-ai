import React, { useMemo } from 'react';
import { Monitor, Smartphone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Project, FileNode } from '@/types';
import { useSettings } from '@/context/SettingsContext';

interface PreviewPanelProps {
  project: Project;
}

export function PreviewPanel({ project }: PreviewPanelProps) {
  const { settings, updateSettings } = useSettings();

  // Find the index.html file in the project
  const indexHtmlFile = useMemo(() => {
    const findFile = (nodes: FileNode[]): FileNode | undefined => {
      for (const node of nodes) {
        if (node.name === 'index.html' && node.type === 'file') {
          return node;
        }
        if (node.type === 'folder' && node.children) {
          const found = findFile(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return findFile(project.files);
  }, [project.files]);

  // For a more advanced preview, we'd inject CSS/JS here.
  // For now, we render the content of index.html.
  const srcDoc = indexHtmlFile?.content || '';

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
      
      <div className='flex-1 flex items-center justify-center p-4 bg-slate-100'>
        {indexHtmlFile ? (
          <div className={`shadow-2xl rounded-lg overflow-hidden bg-white transition-all duration-300 ${
            settings.viewMode === 'mobile' 
              ? 'w-[375px] h-[667px]' 
              : 'w-full h-full max-w-5xl'
          }`}>
            <iframe
              srcDoc={srcDoc}
              title='Project Preview'
              className='w-full h-full border-none'
              sandbox='allow-scripts allow-modals allow-forms allow-popups allow-same-origin'
            />
          </div>
        ) : (
          <div className='max-w-md w-full text-center space-y-4 p-8 bg-background rounded-xl shadow-sm border'>
            <div className='w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground'>
              <AlertCircle className='w-8 h-8' />
            </div>
            <div className='space-y-2'>
              <h3 className='text-xl font-semibold'>No index.html found</h3>
              <p className='text-sm text-muted-foreground'>
                To see a preview, make sure your project has an 'index.html' file at the root or in the 'src' folder.
              </p>
            </div>
            <div className='pt-4'>
              <p className='text-xs text-muted-foreground italic'>
                Tip: Ask the AI to 'Create an index.html file for me'.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

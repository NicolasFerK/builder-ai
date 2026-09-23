import React, { useMemo, useState } from 'react';
import { Monitor, Smartphone, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Project, FileNode } from '@/types';
import { useSettings } from '@/context/SettingsContext';

interface PreviewPanelProps {
  project: Project;
}

export function PreviewPanel({ project }: PreviewPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to find a file by path in the project tree
  const getFileByPath = (nodes: FileNode[], targetPath: string): FileNode | undefined => {
    const parts = targetPath.split('/').filter(p => p.length > 0);
    
    function search(currentNodes: FileNode[], currentParts: string[]): FileNode | undefined {
      if (currentParts.length === 0) return undefined;
      
      const [head, ...tail] = currentParts;
      const found = currentNodes.find(n => n.name === head);
      
      if (!found) return undefined;
      
      if (tail.length === 0) {
        return found.type === 'file' ? found : undefined;
      }
      
      if (found.type === 'folder' && found.children) {
        return search(found.children, tail);
      }
      
      return undefined;
    }
    
    return search(nodes, parts);
  };

  // Collect all files in the project
  const allFiles = useMemo(() => {
    const files: { path: string; content: string; type: string }[] = [];
    
    function traverse(nodes: FileNode[], currentPath: string) {
      for (const node of nodes) {
        const path = currentPath ? `${currentPath}/${node.name}` : node.name;
        if (node.type === 'file' && node.content) {
          files.push({ path, content: node.content, type: node.name.split('.').pop() || '' });
        } else if (node.type === 'folder' && node.children) {
          traverse(node.children, path);
        }
      }
    }
    
    traverse(project.files, '');
    return files;
  }, [project.files]);

  const handleReload = () => {
    setIsReloading(true);
    setError(null);
    // Small delay to show the loading state
    setTimeout(() => {
      setIsReloading(false);
    }, 500);
  };

  // Build the srcDoc
  const srcDoc = useMemo(() => {
    const indexHtmlFile = getFileByPath(project.files, 'index.html') || 
                          getFileByPath(project.files, 'src/index.html');
    
    if (!indexHtmlFile) return '';

    let html = indexHtmlFile.content || '';

    // 1. Scripts for runtime support
    // Babel for TS/JSX
    const babelScript = `<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n`;
    // Tailwind for styling
    const tailwindScript = `<script src="https://cdn.tailwindcss.com"></script>\n`;
    // A small shim to help with "module" like behavior via a global VFS
    const vfsScript = `
      <script>
        window.__VFS__ = {};
        (function injectVFS() {
          const files = ${JSON.stringify(allFiles.map(f => ({ path: f.path, content: f.content })))};
          files.forEach(f => { window.__VFS__[f.path] = f.content; });
        })();
        // Simple shim for imports if the user uses them (though it's limited in srcDoc)
        // In a real environment, we'd use a more robust module loader.
        console.log('VFS initialized with', Object.keys(window.__VFS__).length, 'files');
      </script>
    `;
    
    // 2. Prepare all CSS files as <style> tags
    const cssStyles = allFiles
      .filter(f => f.type === 'css')
      .map(f => `<style id="style-${f.path.replace(/\//g, '-')}" data-path="${f.path}">${f.content}</style>`)
      .join('\n');

    // 3. Prepare all JS/TS/TSX files as <script type="text/babel">
    // We'll inject them and they will run in order.
    const jsScripts = allFiles
      .filter(f => ['js', 'jsx', 'ts', 'tsx'].includes(f.type))
      .map(f => `<script type="text/babel" data-path="${f.path}">${f.content}</script>`)
      .join('\n');

    // 4. Clean up original script/link tags from index.html to avoid 404s in the iframe
    // We'll remove anything that looks like a local relative path
    html = html.replace(/<script\s+[^>]*src=["'](\/|.\/|\.\.\/)[^"']*["'][^>]*><\/script>/g, '');
    html = html.replace(/<link\s+[^>]*href=["'](\/|.\/|\.\.\/)[^"']*["'][^>]*><\/link>/g, '');
    html = html.replace(/<link\s+[^>]*href=["'](\/|.\/|\.\.\/)[^"']*["'][^>]*>/g, '');

    // 5. Construct final document
    // We'll use a very basic approach: take index.html as the base, and append everything else.
    // If index.html has a <head>, we put styles there. If it has a <body>, we put scripts there.
    
    let headContent = '';
    let bodyContent = '';

    if (html.includes('<head>')) {
      const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
      if (headMatch) headContent = headMatch[1];
    }

    if (html.includes('<body>')) {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
      if (bodyMatch) bodyContent = bodyMatch[1];
    } else {
      bodyContent = html;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          ${babelScript}
          ${tailwindScript}
          ${cssStyles}
          ${headContent}
        </head>
        <body>
          ${vfsScript}
          ${bodyContent}
          ${jsScripts}
        </body>
      </html>
    `;
  }, [allFiles, project.files]);

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
      
      <div className='flex-1 flex items-center justify-center p-4 bg-slate-100 overflow-hidden'>
        {srcDoc ? (
          <div className={`shadow-2xl rounded-lg overflow-hidden bg-white transition-all duration-300 ${
            settings.viewMode === 'mobile' 
              ? 'w-[375px] h-[667px]' 
              : 'w-full h-full max-w-5xl'
          }`}>
            <iframe
              key={srcDoc.length} // Force re-render when srcDoc changes
              srcDoc={srcDoc}
              title='Project Preview'
              className='w-full h-full border-none'
              sandbox='allow-scripts allow-modals allow-forms allow-popups allow-same-origin'
              onError={() => setError('Failed to load preview. Check the console for errors.')}
            />
            {error && (
              <div className='absolute bottom-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-lg'>
                <AlertCircle className='w-3 h-3' />
                {error}
              </div>
            )}
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

import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Smartphone, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { FileNode } from '@/types';

interface PreviewPanelProps {
  projectId: string;
  files: FileNode[];
}

export function PreviewPanel({ projectId, files }: PreviewPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [status, setStatus] = useState<'loading' | 'running' | 'error' | 'not_found'>('loading');
  const [port, setPort] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  // Function to start or fetch preview status
  const startPreview = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const response = await fetch('/api/start-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.statusMessage || 'Failed to start preview');
      }

      if (data.status === 'error') {
        throw new Error(data.diagnostics?.error || 'Server reported an error');
      }

      setPort(data.port);
      setPreviewUrl(data.url);
      setStatus('running');
    } catch (err: any) {
      console.error('[PREVIEW] Error starting preview:', err);
      setError(err.message);
      setStatus('error');
    }
  }, [projectId]);

  // Function to restart preview
  const restartPreview = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const response = await fetch('/api/restart-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.statusMessage || 'Failed to restart preview');
      }

      if (data.status === 'error') {
        throw new Error(data.diagnostics?.error || 'Server reported an error');
      }

      setPort(data.port);
      setPreviewUrl(data.url);
      setStatus('running');
      setIframeKey(prev => prev + 1);
    } catch (err: any) {
      console.error('[PREVIEW] Error restarting preview:', err);
      setError(err.message);
      setStatus('error');
    }
  }, [projectId]);

  // Initial start
  useEffect(() => {
    if (projectId) {
      startPreview();
    }
  }, [projectId, startPreview]);

  // Reload iframe when files change (debounced)
  useEffect(() => {
    if (status === 'running' && port) {
      const timer = setTimeout(() => {
        setIframeKey(prev => prev + 1);
      }, 1000); // debounce reload for 1s after last file change
      return () => clearTimeout(timer);
    }
  }, [files, status, port]);

  const handleRefresh = () => {
    restartPreview();
  };

  return (
    <div className='flex flex-col h-full bg-muted/30'>
      <div className='p-2 border-b flex items-center justify-between bg-background'>
        <div className='flex items-center gap-2'>
          <span className='text-xs font-medium text-muted-foreground px-2'>Preview</span\>
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
            onClick={handleRefresh}
            disabled={status === 'loading'}
          >
            <RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      <div className='flex-1 flex items-center justify-center p-4 bg-slate-100 overflow-hidden relative'>
        <div className={`shadow-2xl rounded-lg overflow-hidden bg-white transition-all duration-300 ${
          settings.viewMode === 'mobile' 
            ? 'w-[375px] h-[667px]' 
            : 'w-full h-full max-w-5xl'
        }`}>
          {status === 'loading' && (
            <div className='w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground'>
              <Loader2 className='w-12 h-12 animate-spin opacity-20' />
              <p className='text-sm font-medium'>Initializing preview environment...</p>
            </div>
          )}

          {status === 'error' && (
            <div className='w-full h-full flex flex-col items-center justify-center gap-4 p-8 text-center'>
              <div className='p-3 bg-destructive/10 rounded-full'>
                <AlertCircle className='w-10 h-10 text-destructive' />
              </div>
              <div className='space-y-2'>
                <h3 className='text-lg font-semibold text-foreground'>Preview Failed</h3>
                <p className='text-sm text-muted-foreground max-w-xs mx-auto'>
                  {error || 'An unexpected error occurred while starting the preview server.'}
                </p>
              </div>
              <Button onClick={startPreview} variant='outline' className='mt-2'>
                Try Again
              </Button>
            </div>
          )}

          {status === 'running' && previewUrl && (
            <iframe
              key={iframeKey}
              src={previewUrl}
              className='w-full h-full border-none'
              title="Project Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}
        </div>
      </div>
    </div>
  );
}

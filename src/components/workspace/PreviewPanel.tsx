import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Smartphone, RefreshCw, Loader2, Play, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';

interface PreviewPanelProps {
  projectId: string;
}

type PreviewStatus = 'running' | 'starting' | 'stopped' | 'error' | 'not_found';

export function PreviewPanel({ projectId }: PreviewPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [isReloading, setIsReloading] = useState(false);
  const [status, setStatus] = useState<PreviewStatus>('not_found');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPreviewStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/get-preview-url?projectId=${projectId}`);
      const data = await response.json();

      if (data.status === 'not_found') {
        setStatus('not_found');
      } else {
        setUrl(data.url || null);
        setStatus(data.status);
        if (data.diagnostics?.error) {
          setError(data.diagnostics.error);
        } else {
          setError(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch preview status', err);
      setStatus('error');
      setError('Failed to connect to preview service');
    }
  }, [projectId]);

  const startPreview = async () => {
    setStatus('starting');
    try {
      const response = await fetch('/api/start-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await response.json();
      if (data.success) {
        setUrl(data.url);
        setStatus(data.status);
      } else {
        throw new Error(data.error || 'Failed to start preview');
      }
    } catch (err: any) {
      console.error('Failed to start preview', err);
      setStatus('error');
      setError(err.message || 'Failed to start preview');
    }
  };

  useEffect(() => {
    fetchPreviewStatus();
    const interval = setInterval(fetchPreviewStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchPreviewStatus]);

  const handleReload = () => {
    setIsReloading(true);
    // For iframe, we just reload the iframe
    // We can also re-fetch status just in case
    fetchPreviewStatus().finally(() => {
      setTimeout(() => setIsReloading(false), 500);
    });
  };

  if (status === 'not_found' && !url) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-muted-foreground gap-4'>
        <Play className='w-12 h-12 opacity-20' />
        <p>No project selected or preview not initialized.</p>
        <Button onClick={startPreview}>Start Preview</Button>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full bg-muted/30'>
      <div className='p-2 border-b flex items-center justify-between bg-background'>
        <div className='flex items-center gap-2'>
          <span className='text-xs font-medium text-muted-foreground px-2'>Preview</span>
          {status === 'running' && (
            <span className='text-[10px] text-green-500 font-bold animate-pulse'>● LIVE</span>
          )}
          {status === 'starting' && (
            <span className='text-[10px] text-amber-500 font-bold animate-pulse'>● STARTING</span>
          )}
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
            disabled={isReloading || status !== 'running'}
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
          {status === 'running' && url ? (
            <iframe 
              src={url} 
              className='w-full h-full border-none'
              title="Project Preview"
            />
          ) : status === 'starting' ? (
            <div className='flex flex-col items-center justify-center h-full gap-4'>
              <Loader2 className='w-12 h-12 animate-spin text-primary' />
              <p className='text-sm text-muted-foreground'>Starting development server...</p>
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center h-full gap-4 p-8 text-center'>
              {status === 'error' && (
                <>
                  <AlertCircle className='w-12 h-12 text-destructive opacity-50' />
                  <div className='space-y-2'>
                    <h3 className='font-semibold text-lg'>Preview Error</h3>
                    <p className='text-sm text-muted-foreground max-w-xs'>
                      {error || 'The development server encountered an error and stopped.'}
                    </p>
                  </div>
                </>
              )}
              {status === 'stopped' && (
                <>
                  <Play className='w-12 h-12 text-primary opacity-50' />
                  <p className='text-sm text-muted-foreground'>The preview server is stopped.</p>
                </>
              )}
              {status === 'not_found' && (
                <>
                  <AlertCircle className='w-12 h-12 text-muted-foreground opacity-50' />
                  <p className='text-sm text-muted-foreground'>No active preview found.</p>
                </>
              )}
              <Button onClick={startPreview} className='mt-2'>
                {status === 'error' ? 'Retry Starting' : 'Start Preview'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

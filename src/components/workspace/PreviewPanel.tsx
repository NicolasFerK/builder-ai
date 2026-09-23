import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Monitor, Smartphone, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';

interface PreviewPanelProps {
  // project prop is no longer needed for the real preview implementation
}

export function PreviewPanel({}: PreviewPanelProps) {
  const { projectId } = useParams();
  const { settings, updateSettings } = useSettings();
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devServerUrl, setDevServerUrl] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'starting' | 'running' | 'error' | 'not_found'>('loading');

  const fetchPreviewStatus = useCallback(async () => {
    if (!projectId) return;

    try {
      // First, ensure the server is started
      const startRes = await fetch('/api/start-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!startRes.ok) throw new Error('Failed to start preview');

      // Now poll for the URL and status
      const urlRes = await fetch(`/api/get-preview-url?projectId=${projectId}`);
      if (!urlRes.ok) throw new Error('Failed to fetch preview URL');
      
      const data = await urlRes.json();
      
      if (data.status === 'not_found') {
        setStatus('not_found');
      } else if (data.status === 'running') {
        setDevServerUrl(data.url);
        setStatus('running');
        setError(null);
      } else if (data.status === 'starting') {
        setStatus('starting');
      } else if (data.status === 'error') {
        setStatus('error');
        setError('Server error. Check logs.');
      }
    } catch (e) {
      console.error('Failed to discover dev server URL', e);
      setStatus('error');
      setError('Failed to connect to preview server');
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    fetchPreviewStatus();

    // Polling for status changes (e.g. from starting to running)
    const interval = setInterval(() => {
      // If we are already running, we might still want to poll to ensure it's still up,
      // but mostly we poll while it's 'starting'.
      if (status === 'starting' || status === 'loading' || status === 'error') {
        fetchPreviewStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [projectId, status, fetchPreviewStatus]);

  const handleReload = async () => {
    setIsReloading(true);
    setError(null);
    
    if (projectId) {
      try {
        // We can try to trigger a restart if we want, 
        // but usually HMR handles file changes.
        // For now, just a manual refresh of the iframe.
        await fetchPreviewStatus();
      } catch (e) {
        setError('Failed to refresh preview');
      }
    }
    
    setTimeout(() => {
      setIsReloading(false);
    }, 500);
  };

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
            disabled={isReloading || status === 'starting'}
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
          {status === 'loading' || status === 'starting' ? (
            <div className='w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground bg-white'>
              <Loader2 className='w-8 h-8 animate-spin text-primary' />
              <p className='text-sm font-medium'>Starting dev server...</p>
            </div>
          ) : status === 'running' ? (
            <iframe
              key={devServerUrl}
              src={devServerUrl}
              title='Project Preview'
              className='w-full h-full border-none'
              sandbox='allow-scripts allow-modals allow-forms allow-popups allow-same-origin'
            />
          ) : status === 'error' || status === 'not_found' ? (
            <div className='w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground bg-white'>
              <AlertCircle className='w-8 h-8 text-destructive' />
              <p className='text-sm font-medium'>{error || 'Preview unavailable'}</p>
              <Button variant='outline' size='sm' onClick={() => fetchPreviewStatus()}>
                Try Again
              </Button>
            </div>
          ) : null}
          
          {error && status === 'running' && (
            <div className='absolute bottom-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-lg'>
              <AlertCircle className='w-3 h-3' />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

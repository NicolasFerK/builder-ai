import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Monitor, Smartphone, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { FileNode } from '@/types';

interface PreviewPanelProps {
  projectId: string;
  files: FileNode[]; // Kept for interface compatibility, though not used for iframe content
}

type PreviewStatus = 'loading' | 'starting' | 'running' | 'error';

export function PreviewPanel({ projectId }: PreviewPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const statusRef = useRef<PreviewStatus>('loading');
  const isMountedRef = useRef<boolean>(true);

  // Sync status ref with state for stable callbacks
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Handle mounting/unmounting
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/get-preview-url?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (!isMountedRef.current) return;

      if (data.status === 'not_found') {
        setStatus('error');
        setError('Project not found on server.');
        stopPolling();
        return;
      }

      if (data.status === 'running') {
        setUrl(data.url);
        setStatus('running');
        stopPolling();
      } else if (data.status === 'error') {
        setStatus('error');
        setError(data.diagnostics?.npmRunDevError || data.diagnostics?.npmInstallError || 'Failed to start development server.');
        stopPolling();
      } else if (data.status === 'starting') {
        setStatus('starting');
      }
    } catch (err: any) {
      console.error('[PREVIEW] Polling error:', err);
      // If we are already running, don't let a polling error crash the UI
      if (isMountedRef.current && statusRef.current !== 'running') {
        setStatus('error');
        setError(err.message);
        stopPolling();
      }
    }
  }, [projectId, stopPolling]); // Removed 'status' from dependencies

  const startPreview = useCallback(async () => {
    stopPolling();
    
    if (!isMountedRef.current) return;

    setStatus('loading');
    setError(null);
    setUrl(null);

    try {
      const response = await fetch('/api/start-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!isMountedRef.current) return;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.statusMessage || `Failed to start preview: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!isMountedRef.current) return;

      if (data.success) {
        if (data.status === 'running') {
          setUrl(data.url);
          setStatus('running');
        } else if (data.status === 'error') {
          // Handle error immediately to avoid unnecessary polling
          setStatus('error');
          setError(data.diagnostics?.npmRunDevError || data.diagnostics?.npmInstallError || 'Failed to start development server.');
          stopPolling();
        } else {
          setStatus('starting');
          // Start polling to wait for 'running' status
          pollingRef.current = setInterval(checkStatus, 2000);
        }
      } else {
        throw new Error('Failed to initiate preview start.');
      }
    } catch (err: any) {
      console.error('[PREVIEW] Start error:', err);
      if (isMountedRef.current) {
        setStatus('error');
        setError(err.message);
      }
    }
  }, [projectId, stopPolling, checkStatus]); // All dependencies are now stable

  useEffect(() => {
    startPreview();

    return () => {
      stopPolling();
    };
  }, [startPreview, stopPolling, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
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
            onClick={handleRefresh}
            disabled={status === 'loading' || status === 'starting'}
          >
            <RefreshCw className={`h-4 w-4 ${status === 'starting' ? 'animate-spin' : ''}`} />
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
            <div className='w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground'>
              <Loader2 className='w-12 h-12 animate-spin opacity-20' />
              <div className='text-center'>
                <p className='font-medium text-foreground'>{status === 'loading' ? 'Initializing...' : 'Starting Dev Server...'}</p>
                <p className='text-sm'>This may take a moment for the first run.</p>
              </div>
            </div>
          ) : status === 'error' ? (
            <div className='w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center'>
              <div className='w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center'>
                <AlertCircle className='w-8 h-8 text-destructive' />
              </div>
              <div className='max-w-sm'>
                <h3 className='text-lg font-semibold text-foreground'>Preview Failed</h3>
                <p className='text-sm text-muted-foreground mt-2 whitespace-pre-wrap'>
                  {error || 'An unknown error occurred while starting the preview.'}
                </p>
              </div>
              <Button onClick={handleRefresh} variant='default' className='mt-2'>
                Try Again
              </Button>
            </div>
          ) : url ? (
            <iframe
              src={url}
              className='w-full h-full border-none'
              title="App Preview"
              sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
            />
          ) : (
            <div className='w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-4'>
              <RefreshCw className='w-12 h-12 opacity-20' />
              <p>Nenhum arquivo para pré-visualizar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Monitor, Smartphone, AlertCircle, RefreshCw, Loader2, Terminal, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Diagnostics {
  projectId: string;
  projectPath: string;
  status: string;
  port: number;
  stdout: string;
  stderr: string;
  error: string | null;
  exitCode: number | null;
  npmInstallError: string | null;
  npmInstallExitCode: number | null;
  npmRunDevError: string | null;
}

interface PreviewPanelProps {
  // project prop is no longer needed for the real preview implementation
}

export function PreviewPanel({}: PreviewPanelProps) {
  const { projectId } = useParams();
  const { settings, updateSettings } = useSettings();
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [devServerUrl, setDevServerUrl] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'starting' | 'running' | 'error' | 'not_found'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const fetchPreviewStatus = useCallback(async () => {
    if (!projectId) return;

    console.log('[PREVIEW-DEBUG] projectId', projectId);

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
        setDiagnostics(null);
        setRetryCount(0);
      } else if (data.status === 'running') {
        setDevServerUrl(data.url);
        setStatus('running');
        setError(null);
        setDiagnostics(null);
        setRetryCount(0);
      } else if (data.status === 'starting') {
        setStatus('starting');
        setDiagnostics(null);
        setRetryCount(0);
      } else if (data.status === 'error') {
        setStatus('error');
        setError(data.diagnostics?.error || 'Server error. Check logs.');
        setDiagnostics(data.diagnostics || null);
        // We don't reset retryCount here, it's handled in the useEffect
      }
    } catch (e) {
      console.error('Failed to discover dev server URL', e);
      setStatus('error');
      setError('Failed to connect to preview server');
      setDiagnostics(null);
      throw e; // Rethrow to be caught by the caller/useEffect
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    if (retryCount >= MAX_RETRIES && status === 'error') {
        return;
    }

    fetchPreviewStatus().catch(() => {
        setRetryCount(prev => prev + 1);
    });

    // Polling for status changes (e.g. from starting to running)
    const interval = setInterval(() => {
      // If we are already running, we might still want to poll to ensure it's still up,
      // but mostly we poll while it's 'starting'.
      if (status === 'starting' || status === 'loading' || status === 'error') {
        if (retryCount < MAX_RETRIES) {
            fetchPreviewStatus().catch(() => {
                setRetryCount(prev => prev + 1);
            });
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [projectId, status, fetchPreviewStatus, retryCount]);

  const handleReload = async () => {
    setIsReloading(true);
    setError(null);
    setDiagnostics(null);
    
    if (projectId) {
      try {
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
            onClick={handleReload}
            disabled={isReloading || status === 'starting'}
          >
            {isReloading ? <Loader2 className='w-4 h-4 animate-spin' /> : <RefreshCw className='w-4 h-4' />}
          </Button>
        </div >
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
            <div className='w-full h-full flex flex-col bg-white overflow-hidden'>
              <div className='flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6'>
                <AlertCircle className='w-8 h-8 text-destructive' />
                <p className='text-sm font-medium text-center'>{error || 'Preview unavailable'}</p>
                <Button variant='outline' size='sm' onClick={() => fetchPreviewStatus()}>
                  Try Again
                </Button>
              </div>

              {diagnostics && (
                <div className='h-1/2 border-t bg-slate-50 flex flex-col'>
                  <div className='p-2 border-b bg-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-600'>
                    <Terminal className='w-3 h-3' />
                    DIAGNOSTICS
                  </div>
                  <ScrollArea className='flex-1 p-4 font-mono text-[10px] leading-tight'>
                    <div className='space-y-4'>
                      <section>
                        <h4 className='text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]'>System Info</h4>
                        <div className='grid grid-cols-2 gap-x-4 gap-y-1'>
                          <div><span className='text-slate-500'>Project ID:</span> {diagnostics.projectId}</div>
                          <div><span className='text-slate-500'>Status:</span> {diagnostics.status}</div>
                          <div><span className='text-slate-500'>Path:</span> {diagnostics.projectPath}</div>
                          <div><span className='text-slate-500'>Port:</span> {diagnostics.port}</div>
                          <div><span className='text-slate-500'>Exit Code:</span> {diagnostics.exitCode ?? 'N/A'}</div>
                        </div>
                      </section>

                      {diagnostics.error && (
                        <section>
                          <h4 className='text-destructive font-bold mb-1 uppercase tracking-wider text-[9px]'>Main Error</h4>
                          <div className='bg-red-50 text-red-700 p-2 rounded border border-red-100 whitespace-pre-wrap break-all'>
                            {diagnostics.error}
                          </div>
                        </section>
                      )}

                      {diagnostics.npmInstallError && (
                        <section>
                          <h4 className='text-amber-600 font-bold mb-1 uppercase tracking-wider text-[9px]'>NPM Install Error</h4>
                          <div className='bg-amber-50 text-amber-800 p-2 rounded border border-amber-100 whitespace-pre-wrap break-all'>
                            {diagnostics.npmInstallError} (Exit: {diagnostics.npmInstallExitCode})
                          </div>
                        </section>
                      )}

                      {(diagnostics.stdout || diagnostics.stderr) && (
                        <section>
                          <h4 className='text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]'>Process Logs</h4>
                          <div className='space-y-2'>
                            {diagnostics.stdout && (
                              <div>
                                <div className='text-blue-600 mb-1'>[STDOUT]</div>
                                <div className='bg-blue-50 text-blue-800 p-2 rounded border border-blue-100 whitespace-pre-wrap break-all'>
                                  {diagnostics.stdout}
                                </div>
                              </div>
                            )}
                            {diagnostics.stderr && (
                              <div>
                                <div className='text-red-600 mb-1'>[STDERR]</div>
                                <div className='bg-red-50 text-red-800 p-2 rounded border border-red-100 whitespace-pre-wrap break-all'>
                                  {diagnostics.stderr}
                                </div>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
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

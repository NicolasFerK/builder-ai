import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';

interface PreviewPanelProps {
  // project prop is no longer needed for the real preview implementation
}

export function PreviewPanel({}: PreviewPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devServerUrl, setDevServerUrl] = useState<string>('http://localhost:5173');

  useEffect(() => {
    const discoverUrl = async () => {
      try {
        const response = await fetch('/api/get-preview-url');
        if (!response.ok) throw new Error('Failed to fetch preview URL');
        const data = await response.json();
        setDevServerUrl(data.url);
      } catch (e) {
        console.error('Failed to discover dev server URL', e);
        // Fallback to default if API fails
        setDevServerUrl('http://localhost:5173');
      }
    };
    discoverUrl();
  }, []);

  const handleReload = () => {
    setIsReloading(true);
    setError(null);
    // Small delay to show the loading state
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
            disabled={isReloading}
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
          <iframe
            key={devServerUrl}
            src={devServerUrl}
            title='Project Preview'
            className='w-full h-full border-none'
            sandbox='allow-scripts allow-modals allow-forms allow-popups allow-same-origin'
            onError={() => setError('Failed to load preview. Is the dev server running?')}
          />
          {error && (
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

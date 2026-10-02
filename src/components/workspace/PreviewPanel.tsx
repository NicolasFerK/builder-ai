import React, { useEffect, useState } from 'react';
import {
  Monitor,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/SettingsContext';

interface PreviewPanelProps {
  projectId: string;
  files: any[];
}

export function PreviewPanel({ projectId }: PreviewPanelProps) {
  const { settings, updateSettings } = useSettings();
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startPreview() {
      setLoading(true);
      setError(null);
      setPreviewUrl(null);

      try {
        const response = await fetch('/api/start-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.statusMessage ||
            data.message ||
            'Não foi possível iniciar o preview.'
          );
        }

        if (data.status === 'error' || !data.url) {
          throw new Error(
            data.statusMessage ||
            'O servidor do projeto não iniciou corretamente.'
          );
        }

        if (!cancelled) {
          setPreviewUrl(data.url);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Erro ao iniciar o preview.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    startPreview();

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey]);

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="p-2 border-b flex items-center justify-between bg-background">
        <span className="text-xs font-medium text-muted-foreground px-2">
          Preview
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Reiniciar preview"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Abrir em nova aba"
            onClick={() => {
              if (previewUrl) {
                window.open(previewUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            disabled={!previewUrl || loading}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={settings.viewMode === 'desktop' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              title="Desktop"
              onClick={() => updateSettings({ viewMode: 'desktop' })}
            >
              <Monitor className="w-4 h-4" />
            </Button>

            <Button
              variant={settings.viewMode === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              title="Mobile"
              onClick={() => updateSettings({ viewMode: 'mobile' })}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 bg-slate-100 overflow-hidden">
        <div
          className={`shadow-2xl rounded-lg overflow-hidden bg-white transition-all duration-300 ${
            settings.viewMode === 'mobile'
              ? 'w-[375px] h-[667px] max-w-full max-h-full'
              : 'w-full h-full max-w-5xl'
          }`}
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Iniciando preview do projeto...
              </p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-destructive">
                Falha ao iniciar o preview
              </p>
              <p className="text-xs text-muted-foreground break-words">
                {error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRefreshKey((key) => key + 1)}
              >
                Tentar novamente
              </Button>
            </div>
          ) : previewUrl ? (
            <iframe
              key={`${projectId}-${refreshKey}`}
              title={`Preview do projeto ${projectId}`}
              src={previewUrl}
              className="w-full h-full border-0 bg-white"
              allow="clipboard-read; clipboard-write"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

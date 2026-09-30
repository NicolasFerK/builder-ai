import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AISettings } from '@/types';

interface SettingsContextType {
  settings: AISettings & { publicPreviewUrl?: string };
  updateSettings: (newSettings: Partial<AISettings>) => void;
  updatePublicPreviewUrl: (url: string | undefined) => Promise<void>;
  resetSettings: () => void;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AISettings & { publicPreviewUrl?: string } = {
  apiUrl: '',
  theme: 'light',
  viewMode: 'desktop',
  publicPreviewUrl: undefined
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AISettings & { publicPreviewUrl?: string }>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const config = await response.json();
          setSettings({ 
            apiUrl: config.aisettings?.apiUrl ?? DEFAULT_SETTINGS.apiUrl,
            theme: config.aisettings?.theme ?? DEFAULT_SETTINGS.theme,
            viewMode: config.aisettings?.viewMode ?? DEFAULT_SETTINGS.viewMode,
            apiKey: config.aisettings?.apiKey,
            modelName: config.aisettings?.modelName,
            publicPreviewUrl: config.publicPreviewUrl 
          });
        }
      } catch (error) {
        console.error('Failed to load settings from server:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<AISettings>) => {
    // Optimistic update
    const previousSettings = { ...settings };
    setSettings((prev) => ({ ...prev, ...newSettings }));

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aisettings: newSettings }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.statusMessage || errorData.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      setSettings(previousSettings);
      throw error;
    }
  };

  const updatePublicPreviewUrl = async (url: string | undefined) => {
    // Optimistic update
    const previousUrl = settings.publicPreviewUrl;
    setSettings((prev) => ({ ...prev, publicPreviewUrl: url }));

    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicPreviewUrl: url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.statusMessage || errorData.message || 'Failed to save preview URL');
      }
    } catch (error) {
      console.error('Failed to update preview URL:', error);
      setSettings((prev) => ({ ...prev, publicPreviewUrl: previousUrl }));
      throw error;
    }
  };

  const resetSettings = async () => {
    // Optimistic update
    const previousSettings = { ...settings };
    setSettings(DEFAULT_SETTINGS);

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aisettings: { 
          apiUrl: '', 
          theme: 'light', 
          viewMode: 'desktop' 
        } }),
      });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      setSettings(previousSettings);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, updatePublicPreviewUrl, resetSettings, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

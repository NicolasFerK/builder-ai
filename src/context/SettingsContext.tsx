import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AISettings } from '@/types';

const SETTINGS_KEY = 'ai_settings';

interface SettingsContextType {
  settings: AISettings;
  updateSettings: (newSettings: Partial<AISettings>) => void;
  resetSettings: () => void;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AISettings>(() => {
    if (typeof window === 'undefined') return { apiUrl: '', theme: 'light' };
    
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          apiUrl: parsed.apiUrl || '',
          apiKey: parsed.apiKey,
          modelName: parsed.modelName,
          theme: parsed.theme || 'light',
        };
      } catch (e) {
        console.error('Failed to parse settings', e);
        return { apiUrl: '', theme: 'light' };
      }
    }
    return { apiUrl: '', theme: 'light' };
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const updateSettings = (newSettings: Partial<AISettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const resetSettings = () => {
    const defaultSettings: AISettings = { apiUrl: '', theme: 'light' };
    setSettings(defaultSettings);
    localStorage.removeItem(SETTINGS_KEY);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, isLoaded }}>
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

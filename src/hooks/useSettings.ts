import { useState, useEffect } from 'react';
import { AISettings } from '@/types';

const SETTINGS_KEY = 'ai_settings';

export const useSettings = () => {
  const [settings, setSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse settings', e);
        return { apiUrl: '' };
      }
    }
    return { apiUrl: '' };
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
    const defaultSettings: AISettings = { apiUrl: '' };
    setSettings(defaultSettings);
    localStorage.removeItem(SETTINGS_KEY);
  };

  return { settings, updateSettings, resetSettings, isLoaded };
};

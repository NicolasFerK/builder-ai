import fs from 'fs/promises';
import path from 'path';
import { AISettings } from '../../src/types';

export interface AppConfig {
  aisettings: AISettings;
  publicPreviewUrl?: string;
}

const DEFAULT_AISettings: AISettings = {
  apiUrl: '',
  theme: 'light',
  viewMode: 'desktop'
};

const DEFAULT_CONFIG: AppConfig = {
  aisettings: { ...DEFAULT_AISettings },
  publicPreviewUrl: undefined
};

const CONFIG_FILE = path.join(process.cwd(), 'server', 'config.json');

export class ConfigService {
  private static instance: ConfigService;
  private config: AppConfig | null = null;

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  async load(): Promise<AppConfig> {
    if (this.config) return this.config;

    try {
      const content = await fs.readFile(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      
      this.config = {
        aisettings: {
          ...DEFAULT_AISettings,
          ...(parsed.aisettings || {}),
        },
        publicPreviewUrl: parsed.publicPreviewUrl
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.config = { ...DEFAULT_CONFIG };
        await this.save(this.config);
      } else {
        console.error('[ConfigService] Error loading config:', error);
        this.config = { ...DEFAULT_CONFIG };
      }
    }
    return this.config;
  }

  async save(newConfig: Partial<AppConfig>): Promise<AppConfig> {
    const currentConfig = await this.load();
    
    const updatedConfig: AppConfig = {
      ...currentConfig,
      ...newConfig,
    };

    if (newConfig.aisettings) {
      updatedConfig.aisettings = {
        ...currentConfig.aisettings,
        ...newConfig.aisettings,
      };
    }

    try {
      await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
      await fs.writeFile(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), 'utf-8');
      this.config = updatedConfig;
    } catch (error) {
      console.error('[ConfigService] Error saving config:', error);
      throw error;
    }
    return updatedConfig;
  }

  async getAISettings(): Promise<AISettings> {
    const config = await this.load();
    return config.aisettings;
  }

  async updateAISettings(newAISettings: Partial<AISettings>): Promise<AISettings> {
    const updatedConfig = await this.save({ aisettings: newAISettings });
    return updatedConfig.aisettings;
  }

  async getPublicPreviewUrl(): Promise<string | undefined> {
    const config = await this.load();
    return config.publicPreviewUrl;
  }

  async updatePublicPreviewUrl(url: string | undefined): Promise<string | undefined> {
    const updatedConfig = await this.save({ publicPreviewUrl: url });
    return updatedConfig.publicPreviewUrl;
  }
}

export const configService = ConfigService.getInstance();

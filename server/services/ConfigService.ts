import fs from 'fs/promises';
import path from 'path';
import { AISettings } from '../../src/types';

export interface AppConfig {
  aisettings: AISettings;
  publicPreviewUrl?: string;
}

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
      this.config = JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.config = {
          aisettings: {
            apiUrl: '',
            theme: 'light',
            viewMode: 'desktop'
          }
        };
        await this.save(this.config);
      } else {
        console.error('[ConfigService] Error loading config:', error);
        this.config = {
          aisettings: {
            apiUrl: '',
            theme: 'light',
            viewMode: 'desktop'
          }
        };
      }
    }
    return this.config;
  }

  async save(newConfig: Partial<AppConfig>): Promise<AppConfig> {
    const currentConfig = await this.load();
    const updatedConfig = { ...currentConfig, ...newConfig };
    
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
    const config = await this.load();
    const updatedAISettings = { ...config.aisettings, ...newAISettings };
    await this.save({ aisettings: updatedAISettings });
    return updatedAISettings;
  }

  async getPublicPreviewUrl(): Promise<string | undefined> {
    const config = await this.load();
    return config.publicPreviewUrl;
  }

  async updatePublicPreviewUrl(url: string | undefined): Promise<string | undefined> {
    await this.save({ publicPreviewUrl: url });
    return url;
  }
}

export const configService = ConfigService.getInstance();

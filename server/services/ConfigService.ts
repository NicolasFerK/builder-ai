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
      console.log('[ConfigService] Loading config from:', CONFIG_FILE);
      const content = await fs.readFile(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      
      console.log('[ConfigService] Config loaded:', JSON.stringify(parsed));
      
      this.config = {
        aisettings: {
          ...DEFAULT_AISettings,
          ...(parsed.aisettings || {}),
        },
        publicPreviewUrl: parsed.publicPreviewUrl
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('[ConfigService] Config file not found, using defaults');
        this.config = { ...DEFAULT_CONFIG };
        await this.save(this.config);
      } else {
        console.error('[ConfigService] Error loading config:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        this.config = { ...DEFAULT_CONFIG };
      }
    }
    return this.config;
  }

  async save(newConfig: Partial<AppConfig>): Promise<AppConfig> {
    const currentConfig = await this.load();
    console.log('[ConfigService] Current config before save:', JSON.stringify(currentConfig));
    console.log('[ConfigService] New partial config to save:', JSON.stringify(newConfig));
    
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

    console.log('[ConfigService] Final updated config:', JSON.stringify(updatedConfig));

    try {
      const dir = path.dirname(CONFIG_FILE);
      console.log('[ConfigService] Ensuring directory exists:', dir);
      await fs.mkdir(dir, { recursive: true });
      
      console.log('[ConfigService] Writing config to:', CONFIG_FILE);
      await fs.writeFile(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), 'utf-8');
      
      this.config = updatedConfig;
      console.log('[ConfigService] Save successful');
    } catch (error) {
      console.error('[ConfigService] Error saving config:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        configPath: CONFIG_FILE
      });
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

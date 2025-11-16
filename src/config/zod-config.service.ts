import { Injectable, Logger } from '@nestjs/common';
import { validateEnv, EnvConfig, checkEnvHealth } from './env.validation';
import { z } from 'zod';
@Injectable()
export class ZodConfigService {
  private readonly logger = new Logger(ZodConfigService.name);
  private readonly config: EnvConfig;
  constructor() {
    try {
      this.config = validateEnv();
      this.logger.log('Environment validation successful');
    } catch (error) {
      this.logger.error('Environment validation failed:', error);
      throw error;
    }
  }
  getConfig(): EnvConfig {
    return this.config;
  }
  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }
  healthCheck(): { healthy: boolean; errors: string[] } {
    return checkEnvHealth();
  }
  getConfigSummary(): Record<string, any> {
    return {
      nodeEnv: this.config.NODE_ENV,
      port: this.config.PORT,
      database: this.config.DATABASE_URL ? 'Configured' : 'Missing',
      supabase: this.config.SUPABASE_URL ? 'Configured' : 'Missing',
      jwt: this.config.JWT_SECRET ? 'Configured' : 'Missing',
      openai: this.config.OPENAI_API_KEY ? 'Configured' : 'Missing',
      gemini: this.config.GEMINI_API_KEY ? 'Configured' : 'Missing',
      sendgrid: this.config.SENDGRID_API_KEY ? 'Configured' : 'Missing',
      streamChat: this.config.STREAM_API_KEY ? 'Configured' : 'Missing',
      cloudinary: this.config.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Missing',
      thirdweb: this.config.THIRDWEB_CLIENT_ID ? 'Configured' : 'Missing',
      walletEncryption: this.config.WALLET_ENCRYPTION_KEY ? 'Configured' : 'Missing',
    };
  }
  validateRuntimeConfig<T>(schema: z.ZodSchema<T>, config: unknown): T {
    try {
      return schema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        this.logger.error(`Runtime config validation failed: ${errorMessages}`);
        throw new Error(`Configuration validation failed: ${errorMessages}`);
      }
      throw error;
    }
  }
}
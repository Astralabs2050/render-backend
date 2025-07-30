import { z } from 'zod';
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  DATABASE_URL: z.string().url('Invalid database URL').optional(),
  SUPABASE_URL: z.string().url('Invalid Supabase URL').optional(),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRATION: z.string().default('7d'),
  SENDGRID_API_KEY: z.string().startsWith('SG.', 'SendGrid API key must start with SG.').optional(),
  SENDGRID_FROM_EMAIL: z.string().email('Invalid sender email').optional(),
  OPENAI_API_KEY: z.string().startsWith('sk-', 'OpenAI API key must start with sk-').optional(),
  STREAM_API_KEY: z.string().min(1, 'Stream Chat API key is required').optional(),
  STREAM_API_SECRET: z.string().min(1, 'Stream Chat secret is required').optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_CALLBACK_URL: z.string().optional(),
  TWITTER_CLIENT_ID: z.string().optional(),
  TWITTER_CLIENT_SECRET: z.string().optional(),
  TWITTER_CALLBACK_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'Cloudinary cloud name is required').optional(),
  CLOUDINARY_API_KEY: z.string().min(1, 'Cloudinary API key is required').optional(),
  CLOUDINARY_API_SECRET: z.string().min(1, 'Cloudinary API secret is required').optional(),
  THIRDWEB_CLIENT_ID: z.string().min(1, 'Thirdweb client ID is required').optional(),
  THIRDWEB_SECRET_KEY: z.string().min(1, 'Thirdweb secret key is required').optional(),
  THIRDWEB_CHAIN_ID: z.string().default('polygon'),
  NFT_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address').optional(),
  MARKETPLACE_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address').optional(),
  WALLET_ENCRYPTION_KEY: z.string().min(32, 'Wallet encryption key must be at least 32 characters').optional(),
  STABILITY_API_KEY: z.string().optional(),
  ASTRIA_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  FRONTEND_URL: z.string().default('http://localhost:3001'),
});
export type EnvConfig = z.infer<typeof envSchema>;
export function validateEnv(env: Record<string, string | undefined> = process.env): EnvConfig {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
    throw error;
  }
}
export const getEnvConfig = (): EnvConfig => {
  return validateEnv();
};
export function checkEnvHealth(): { healthy: boolean; errors: string[] } {
  try {
    validateEnv();
    return { healthy: true, errors: [] };
  } catch (error) {
    return { 
      healthy: false, 
      errors: error instanceof Error ? [error.message] : ['Unknown validation error']
    };
  }
}
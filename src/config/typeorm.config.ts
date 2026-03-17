import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

config();

const isProduction = process.env.NODE_ENV === 'production';
const isTsNode = process.env.TS_NODE === 'true' || process.argv.includes('ts-node');

// Determine the correct paths based on environment
const getPath = (pattern: string) => {
  if (isTsNode || !isProduction) {
    // Development: use TypeScript files
    return path.join(__dirname, '..', pattern);
  } else {
    // Production: use compiled JavaScript files
    return path.join(__dirname, '..', pattern.replace('.ts', '.js'));
  }
};

// Get database URL - support both DATABASE_URL and SUPABASE_URL
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or SUPABASE_URL must be set in .env file');
}

// Determine SSL configuration based on database URL
const sslConfig = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
  ? false
  : { rejectUnauthorized: false };

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: sslConfig,
  entities: [getPath('**/*.entity{.ts,.js}')],
  migrations: [getPath('migrations/*{.ts,.js}')],
  synchronize: false,
  logging: true,
  migrationsRun: false,
});

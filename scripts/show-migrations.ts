// Set environment variable to indicate we're using ts-node
process.env.TS_NODE = 'true';

import { AppDataSource } from '../src/config/typeorm.config';

async function showMigrations() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection established\n');

    const executedMigrations = await AppDataSource.query(
      `SELECT * FROM migrations ORDER BY timestamp ASC`
    );

    console.log('📋 Migration Status:\n');
    
    if (executedMigrations.length === 0) {
      console.log('   No migrations have been executed yet.');
    } else {
      console.log('   Executed Migrations:');
      executedMigrations.forEach((migration: any, index: number) => {
        console.log(`   ${index + 1}. ${migration.name} (${new Date(migration.timestamp).toLocaleString()})`);
      });
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

showMigrations();

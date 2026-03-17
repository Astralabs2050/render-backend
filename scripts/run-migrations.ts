// Set environment variable to indicate we're using ts-node
process.env.TS_NODE = 'true';

import { AppDataSource } from '../src/config/typeorm.config';

async function runMigrations() {
  try {
    console.log('🔄 Initializing database connection...');
    console.log(`📍 Database URL: ${process.env.DATABASE_URL?.substring(0, 30)}...`);
    
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    console.log('🔄 Running migrations...');
    const migrations = await AppDataSource.runMigrations();
    
    if (migrations.length === 0) {
      console.log('✅ No pending migrations');
    } else {
      console.log(`✅ Successfully ran ${migrations.length} migration(s):`);
      migrations.forEach(migration => {
        console.log(`   - ${migration.name}`);
      });
    }

    await AppDataSource.destroy();
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

runMigrations();

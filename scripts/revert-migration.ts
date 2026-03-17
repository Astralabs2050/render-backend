// Set environment variable to indicate we're using ts-node
process.env.TS_NODE = 'true';

import { AppDataSource } from '../src/config/typeorm.config';

async function revertMigration() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    console.log('🔄 Reverting last migration...');
    await AppDataSource.undoLastMigration();
    
    console.log('✅ Migration reverted successfully');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration revert failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

revertMigration();

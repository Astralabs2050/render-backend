require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.SUPABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-saved-jobs-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    await client.query(sql);
    console.log('Migration executed successfully!');
    console.log('saved_jobs table created with indexes and constraints.');

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

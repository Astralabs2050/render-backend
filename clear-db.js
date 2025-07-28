const { Client } = require('pg');
require('dotenv').config();

async function clearDatabase() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to Supabase database...');

        // Get list of custom tables (excluding system tables)
        const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
    `);

        console.log('Found tables:', result.rows.map(r => r.table_name));

        // Drop each table
        for (const row of result.rows) {
            await client.query(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE`);
            console.log(`Dropped table: ${row.table_name}`);
        }

        console.log('Database cleared successfully!');
    } catch (error) {
        console.error('Error clearing database:', error);
    } finally {
        await client.end();
    }
}

clearDatabase();
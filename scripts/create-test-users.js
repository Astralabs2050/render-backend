require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createTestUsers() {
  const client = new Client({
    connectionString: process.env.SUPABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database...');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create maker user
    const makerResult = await client.query(`
      INSERT INTO users (id, email, password, full_name, user_type, location, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        user_type = $4,
        full_name = $3,
        location = $5,
        updated_at = NOW()
      RETURNING id, email, user_type;
    `, ['samueladelowo3@gmail.com', hashedPassword, 'Samuel Adelowo', 'MAKER', 'Lagos, Nigeria']);

    console.log('Maker user created/updated:', makerResult.rows[0]);

    // Create creator user
    const creatorResult = await client.query(`
      INSERT INTO users (id, email, password, full_name, user_type, brand_name, location, created_at, updated_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        user_type = $4,
        full_name = $3,
        brand_name = $5,
        location = $6,
        updated_at = NOW()
      RETURNING id, email, user_type;
    `, ['creator@example.com', hashedPassword, 'Jane Creator', 'CREATOR', 'Fashion House Ltd', 'Lagos, Nigeria']);

    console.log('Creator user created/updated:', creatorResult.rows[0]);

  } catch (error) {
    console.error('Error creating users:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTestUsers();

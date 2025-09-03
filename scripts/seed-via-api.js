const axios = require('axios');

async function seedViaAPI() {
  const baseURL = 'http://localhost:3000';
  
  try {
    // First, let's check if the server is running
    console.log('Checking server status...');
    const healthCheck = await axios.get(`${baseURL}/`);
    console.log('Server is running');

    // Since we can't directly create users via API without auth,
    // let's create a simple endpoint to seed data
    console.log('Database tables should be auto-created by TypeORM synchronization');
    console.log('You can now manually create test users through the OAuth endpoints or registration');
    
    console.log('\nTo create test data:');
    console.log('1. Use OAuth login endpoints to create users');
    console.log('2. Or create users directly in the database when connection is available');
    console.log('3. Then run the seeder: npx ts-node src/database/seeders/seed.command.ts');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

seedViaAPI();

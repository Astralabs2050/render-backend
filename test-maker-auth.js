const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // Change this to your server URL
const EMAIL = 'samueladelowo3@gmail.com';
const PASSWORD = 'Password123!';

async function testMakerAuth() {
  try {
    console.log('=== Testing Maker Authentication ===\n');

    // 1. Login
    console.log('1. Logging in as:', EMAIL);
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    });

    const { accessToken } = loginResponse.data.data;
    console.log('✓ Login successful');
    console.log('Access Token:', accessToken.substring(0, 50) + '...');

    // Decode JWT to see payload (without verification)
    const tokenParts = accessToken.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    console.log('\nJWT Payload:', payload);

    // 2. Test /marketplace/maker/jobs endpoint
    console.log('\n2. Testing /marketplace/maker/jobs endpoint...');
    try {
      const jobsResponse = await axios.get(`${BASE_URL}/marketplace/maker/jobs`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      console.log('✓ Successfully accessed maker/jobs endpoint');
      console.log('Response:', jobsResponse.data);
    } catch (error) {
      console.log('✗ Failed to access maker/jobs endpoint');
      console.log('Error:', error.response?.data || error.message);
    }

    // 3. Test applying to a job
    console.log('\n3. Testing job application...');
    // First get available jobs
    try {
      const availableJobsResponse = await axios.get(`${BASE_URL}/marketplace/jobs`, {
        params: { status: 'open' }
      });

      if (availableJobsResponse.data.data.jobs.length > 0) {
        const jobId = availableJobsResponse.data.data.jobs[0].id;
        console.log('Found job to apply to:', jobId);

        const applyResponse = await axios.post(
          `${BASE_URL}/marketplace/jobs/${jobId}/apply`,
          {
            portfolioLinks: ['https://portfolio.example.com'],
            proposedAmount: 500,
            minimumNegotiableAmount: 450,
            timeline: 7
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );
        console.log('✓ Successfully applied to job');
        console.log('Response:', applyResponse.data);
      } else {
        console.log('No open jobs available to test application');
      }
    } catch (error) {
      console.log('✗ Failed to apply to job');
      console.log('Error:', error.response?.data || error.message);
    }

    // 4. Check user profile
    console.log('\n4. Checking user profile...');
    try {
      const profileResponse = await axios.get(`${BASE_URL}/users/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      console.log('✓ User profile retrieved');
      console.log('User Type:', profileResponse.data.data.userType);
      console.log('User ID:', profileResponse.data.data.id);
      console.log('Email:', profileResponse.data.data.email);
    } catch (error) {
      console.log('✗ Failed to get profile');
      console.log('Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testMakerAuth();
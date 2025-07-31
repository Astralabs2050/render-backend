const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function testEndpoint() {
  try {
    
    const response = await new Promise((resolve, reject) => {
      const req = http.get(`${BASE_URL}/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        });
      });
      req.on('error', reject);
    });
    
    console.log('Success!');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
  } catch (error) {
    console.log('Error!');
    console.log('Message:', error.message);
  }
}

testEndpoint();
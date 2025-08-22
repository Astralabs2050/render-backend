require('dotenv').config();
const axios = require('axios');

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  console.log('API Key exists:', !!apiKey);
  console.log('API Key length:', apiKey?.length || 0);
  console.log('API Key starts with sk-:', apiKey?.startsWith('sk-'));
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    return;
  }
  
  try {
    // Test basic API access
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ OpenAI API access working');
    
    // Test DALL-E 3
    const imageResponse = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'dall-e-3',
        prompt: 'A simple red dress',
        n: 1,
        size: '1024x1024'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ DALL-E 3 working:', imageResponse.data.data[0].url);
    
  } catch (error) {
    console.error('❌ OpenAI Error:', error.response?.data || error.message);
  }
}

testOpenAI();
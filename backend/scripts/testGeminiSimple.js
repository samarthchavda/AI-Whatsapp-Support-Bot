require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testSimple() {
  console.log('🧪 Simple Gemini API Test\n');

  const apiKey = process.env.GEMINI_API_KEY;
  console.log('API Key:', apiKey ? apiKey.substring(0, 20) + '...' : 'NOT FOUND');

  if (!apiKey) {
    console.error('❌ No API key found');
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try the simplest possible call with gemini-pro
    console.log('\n📝 Trying gemini-pro...');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent('Say hello');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Success!');
    console.log('Response:', text);
    console.log('\n💡 Use model: gemini-pro');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n💡 The API key appears to be invalid or expired.');
      console.log('💡 Please verify your API key at: https://makersuite.google.com/app/apikey');
    } else if (error.message.includes('404')) {
      console.log('\n💡 Model not found. Trying alternative...');
      
      // Try without version
      try {
        const genAI2 = new GoogleGenerativeAI(apiKey);
        const model2 = genAI2.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });
        const result2 = await model2.generateContent('Say hello');
        const text2 = result2.response.text();
        console.log('✅ Success with gemini-1.5-flash-8b!');
        console.log('Response:', text2);
        console.log('\n💡 Use model: gemini-1.5-flash-8b');
      } catch (err2) {
        console.error('❌ Also failed:', err2.message);
      }
    }
  }
}

testSimple();

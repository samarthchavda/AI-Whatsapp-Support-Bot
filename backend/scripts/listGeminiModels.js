require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  console.log('🔍 Listing available Gemini models...\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try common model names
    const modelsToTry = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash-exp'
    ];

    console.log('Testing common model names:\n');

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        console.log(`✅ ${modelName} - WORKS`);
      } catch (error) {
        if (error.message.includes('404')) {
          console.log(`❌ ${modelName} - Not found`);
        } else if (error.message.includes('API key')) {
          console.log(`⚠️  ${modelName} - API key issue`);
        } else {
          console.log(`⚠️  ${modelName} - ${error.message.substring(0, 50)}...`);
        }
      }
    }

    console.log('\n💡 Use the model name that shows "WORKS" in your .env file');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listModels();

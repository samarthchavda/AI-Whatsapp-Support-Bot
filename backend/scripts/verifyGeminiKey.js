require('dotenv').config();
const axios = require('axios');

async function verifyKey() {
  console.log('🔑 Verifying Gemini API Key\n');

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('API Key:', apiKey.substring(0, 20) + '...');
  console.log('Length:', apiKey.length, 'characters');
  console.log('Format:', apiKey.startsWith('AIza') ? '✅ Valid format' : '❌ Invalid format');
  console.log('');

  // Try to list models
  try {
    console.log('📋 Fetching available models...\n');
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (response.data && response.data.models) {
      console.log(`✅ Found ${response.data.models.length} models:\n`);
      
      response.data.models.forEach(model => {
        const name = model.name.replace('models/', '');
        const supportedMethods = model.supportedGenerationMethods || [];
        const supportsGenerate = supportedMethods.includes('generateContent');
        
        if (supportsGenerate) {
          console.log(`✅ ${name}`);
          console.log(`   Methods: ${supportedMethods.join(', ')}`);
          console.log('');
        }
      });

      // Find the best model
      const flashModels = response.data.models.filter(m => 
        m.name.includes('flash') && 
        m.supportedGenerationMethods?.includes('generateContent')
      );

      if (flashModels.length > 0) {
        const recommended = flashModels[0].name.replace('models/', '');
        console.log(`\n💡 Recommended model: ${recommended}`);
        console.log(`\nUpdate your .env file:`);
        console.log(`GEMINI_MODEL=${recommended}`);
      }

    } else {
      console.log('⚠️  No models found in response');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error?.message || error.message);
    
    if (error.response?.status === 400) {
      console.log('\n💡 API key might be invalid or restricted');
      console.log('💡 Verify at: https://aistudio.google.com/app/apikey');
    } else if (error.response?.status === 403) {
      console.log('\n💡 API key might not have permission to list models');
      console.log('💡 Try using: gemini-1.5-flash-002 or gemini-1.5-pro-002');
    }
  }
}

verifyKey();

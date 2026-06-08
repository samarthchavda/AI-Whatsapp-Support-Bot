require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API Integration...\n');

  // Check if API key is configured
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log('✅ API Key found:', process.env.GEMINI_API_KEY.substring(0, 20) + '...');
  console.log('📦 Model:', process.env.GEMINI_MODEL || 'gemini-1.5-flash');
  console.log('');

  try {
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const systemInstruction = `You are an intelligent e-commerce customer support assistant for an AI-powered WhatsApp Support Bot platform.

CORE RESPONSIBILITIES:
- Answer customer questions about orders, products, shipping, and policies
- Provide accurate, helpful information in a friendly, professional tone
- Keep responses concise and WhatsApp-friendly (under 200 characters when possible)
- Use emojis sparingly to enhance readability (📦 for orders, ✅ for confirmations, etc.)

RESPONSE GUIDELINES:
1. Be warm and conversational, not robotic
2. Address the customer by name when appropriate
3. If you don't have specific information, guide them to contact support
4. For urgent issues (refunds, complaints), acknowledge and suggest escalation
5. Never make up order details or policies
6. Always maintain a positive, solution-oriented tone`;

    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      systemInstruction: systemInstruction,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 200,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
      ],
    });

    // Test cases
    const testCases = [
      {
        name: 'Order Status Query',
        customerName: 'John',
        message: 'Hi, I want to check my order status'
      },
      {
        name: 'Shipping Question',
        customerName: 'Sarah',
        message: 'How long does shipping usually take?'
      },
      {
        name: 'Return Policy',
        customerName: 'Mike',
        message: 'What is your return policy?'
      },
      {
        name: 'General Greeting',
        customerName: 'Emma',
        message: 'Hello! Can you help me?'
      }
    ];

    console.log('🚀 Running test cases...\n');

    for (const testCase of testCases) {
      console.log(`📝 Test: ${testCase.name}`);
      console.log(`👤 Customer: ${testCase.customerName}`);
      console.log(`💬 Message: "${testCase.message}"`);
      
      try {
        const prompt = `Customer Name: ${testCase.customerName}\nCustomer Message: ${testCase.message}`;
        const result = await model.generateContent(prompt);
        
        // Check for safety blocks
        if (result.response.promptFeedback?.blockReason) {
          console.log(`⚠️  Response blocked: ${result.response.promptFeedback.blockReason}`);
          continue;
        }

        const response = result.response.text();
        const usage = result.response.usageMetadata;

        console.log(`🤖 AI Response: "${response}"`);
        console.log(`📊 Tokens: Prompt=${usage?.promptTokenCount || 0}, Completion=${usage?.candidatesTokenCount || 0}, Total=${usage?.totalTokenCount || 0}`);
        console.log('✅ Test passed!\n');
        
      } catch (error) {
        console.error(`❌ Test failed: ${error.message}\n`);
      }
    }

    console.log('🎉 All tests completed!');
    console.log('\n💡 Gemini 1.5 Flash is now your primary AI engine.');
    console.log('💡 OpenAI will be used as fallback if Gemini fails.');

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    if (error.message.includes('API_KEY_INVALID')) {
      console.error('\n💡 Tip: Check if your GEMINI_API_KEY is correct in .env file');
    }
    process.exit(1);
  }
}

testGeminiAPI();

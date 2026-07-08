const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const systemInstruction = `You are a professional customer support agent for Kwickbot.
Rules:
1. Keep responses clear, professional, and customer-friendly.
2. Address the customer naturally.
3. If you don't know the return policy, tell them to contact support.`;

  const model = genAI.getGenerativeModel({ 
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    systemInstruction: systemInstruction,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 1000,
    }
  });

  const result = await model.generateContent("Customer Name: Mike\nCustomer Message: What is your return policy?");
  console.log('Raw Response JSON:', JSON.stringify(result.response, null, 2));
}

main().catch(err => console.error(err));

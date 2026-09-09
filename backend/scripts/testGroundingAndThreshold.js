/**
 * Grounding & Threshold Verification Test Script
 */
require('dotenv').config();
const mongoose = require('mongoose');
const knowledgeBaseService = require('../services/knowledgeBaseService');
const Admin = require('../models/Admin');

async function testGrounding() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp-bot');
  console.log('🔌 Connected to MongoDB');

  let adminDoc = await Admin.findOne({ email: 'demo@store.com' }) || await Admin.findOne();
  if (!adminDoc) {
    console.error('❌ No admin doc found to test.');
    await mongoose.connection.close();
    return;
  }

  console.log(`\n--- TESTING IN-KNOWLEDGE QUESTIONS (Grounded In PDF) ---`);
  const inKbQuestions = [
    "What is the shipping policy?",
    "How much is standard shipping?",
    "What is the return policy?",
    "What is the support email?"
  ];

  for (const q of inKbQuestions) {
    console.log(`\n❓ Question: "${q}"`);
    const searchRes = await knowledgeBaseService.searchChunks(q, adminDoc._id, 3);
    console.log(`📊 Similarity Scores: ${JSON.stringify(searchRes.metadata.similarityScores)}`);
    console.log(`✅ Passed Threshold (0.65): ${searchRes.metadata.passedThreshold}`);
    
    const kbRes = await knowledgeBaseService.queryKnowledgeBase(q, adminDoc._id);
    console.log(`🤖 Answer: ${kbRes.answer}`);
  }

  console.log(`\n--- TESTING OUT-OF-KNOWLEDGE QUESTIONS (Should NOT Invent Data) ---`);
  const outKbQuestions = [
    "What payment methods do you accept?",
    "Do you offer overnight delivery?",
    "Do you have a physical store in New York?",
    "Do you offer a 50% discount coupon?"
  ];

  for (const q of outKbQuestions) {
    console.log(`\n❓ Question: "${q}"`);
    const searchRes = await knowledgeBaseService.searchChunks(q, adminDoc._id, 3);
    console.log(`📊 Similarity Scores: ${JSON.stringify(searchRes.metadata.similarityScores)}`);
    console.log(`✅ Passed Threshold (0.65): ${searchRes.metadata.passedThreshold}`);
    
    const kbRes = await knowledgeBaseService.queryKnowledgeBase(q, adminDoc._id);
    console.log(`🤖 Answer: ${kbRes.answer}`);
  }

  await mongoose.connection.close();
  console.log('\n✅ Grounding & Threshold tests completed!');
}

testGrounding().catch(console.error);

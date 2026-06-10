#!/usr/bin/env node

/**
 * RAG & Knowledge Base Ingestion Testing Script
 * Usage: 
 *   node scripts/testRAG.js url [url_string] [title]
 *   node scripts/testRAG.js query "[question]"
 * Examples:
 *   node scripts/testRAG.js url "https://raw.githubusercontent.com/chavdasamarth/AI-Whatsapp-Support-Bot/main/README.md" "Bot README FAQ"
 *   node scripts/testRAG.js query "what are the main features of the bot"
 */

require('dotenv').config();
const mongoose = require('mongoose');
const KnowledgeBase = require('../models/KnowledgeBase');
const KnowledgeBaseChunk = require('../models/KnowledgeBaseChunk');
const Admin = require('../models/Admin');
const knowledgeBaseService = require('../services/knowledgeBaseService');

const action = process.argv[2] || 'query';
const param1 = process.argv[3];
const param2 = process.argv[4] || 'Test Title';

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
}

async function runURLIngestion(url, title) {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    console.log(`🌐 Ingesting URL: ${url}`);
    console.log(`Title: ${title}\n`);

    // Find default admin
    let adminDoc = await Admin.findOne({ email: 'demo@store.com' });
    if (!adminDoc) adminDoc = await Admin.findOne();
    if (!adminDoc) {
      throw new Error('No admin user found. Seed database first.');
    }

    // Scrape URL
    console.log('🕸️ Scraping webpage content...');
    const text = await knowledgeBaseService.extractTextFromURL(url);
    console.log(`📝 Extracted ${text.length} characters of text.`);

    // Create KnowledgeBase document
    const kb = new KnowledgeBase({
      title,
      description: 'Ingested via testing script',
      fileType: 'url',
      fileName: url,
      filePath: url,
      fileSize: text.length,
      extractedText: text,
      textLength: text.length,
      uploadedBy: adminDoc._id,
      uploadedByName: adminDoc.name
    });

    await kb.save();
    console.log(`💾 Saved KnowledgeBase document ID: ${kb._id}`);

    // Clean old chunks for this document
    await KnowledgeBaseChunk.deleteMany({ knowledgeBaseId: kb._id });

    // Process chunks & embeddings
    console.log('🧠 Generating embeddings and chunks...');
    const chunks = await knowledgeBaseService.processAndSaveChunks(kb);
    console.log(`✅ Stored ${chunks.length} chunks with embeddings!`);

    await mongoose.connection.close();
    console.log('\n🎉 URL Ingestion test complete!');
  } catch (error) {
    console.error('❌ Error during URL ingestion:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
}

async function runQuery(question) {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');
    console.log(`❓ Question: "${question}"`);

    // Find default admin
    let adminDoc = await Admin.findOne({ email: 'demo@store.com' });
    if (!adminDoc) adminDoc = await Admin.findOne();
    if (!adminDoc) {
      throw new Error('No admin user found. Seed database first.');
    }

    console.log(`🔍 Searching relevant vector chunks for Admin: ${adminDoc.email} (${adminDoc._id})...`);
    const searchResults = await knowledgeBaseService.searchChunks(question, adminDoc._id, 3);
    
    console.log(`\n📋 Semantic Search Results (Top 3):`);
    searchResults.forEach((r, idx) => {
      console.log(`\nMatch #${idx + 1} (Similarity Score: ${r.score.toFixed(4)}):`);
      console.log(`"${r.text.substring(0, 250)}..."`);
    });

    console.log(`\n🧠 Generating RAG response from Gemini...`);
    const result = await knowledgeBaseService.queryKnowledgeBase(question, adminDoc._id);
    console.log('\n🤖 AI Response:');
    console.log('='.repeat(50));
    console.log(result.answer);
    console.log('='.repeat(50));
    console.log(`Found in KB: ${result.foundInKB}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`RAG Pipeline Used: ${result.isRAG ? 'Yes ✓' : 'No ✗'}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error querying RAG:', error.message);
    mongoose.connection.close();
    process.exit(1);
  }
}

async function main() {
  if (action === 'url') {
    if (!param1) {
      console.error('Error: URL parameter is required.');
      console.log('Usage: node scripts/testRAG.js url [url_string] [title]');
      process.exit(1);
    }
    await runURLIngestion(param1, param2);
  } else if (action === 'query') {
    const question = param1 || 'what are the main features of the bot?';
    await runQuery(question);
  } else {
    console.error('Unknown action. Use "url" or "query".');
    process.exit(1);
  }
}

main();

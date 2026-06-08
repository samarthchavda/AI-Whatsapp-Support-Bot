const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
require('dotenv').config();

async function checkConversations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const conversations = await Conversation.find().limit(10);
    
    console.log('\n📊 Conversation Statistics:');
    console.log('='.repeat(60));
    console.log(`Total Conversations: ${await Conversation.countDocuments()}`);
    console.log(`Active: ${await Conversation.countDocuments({ status: 'active' })}`);
    console.log(`Resolved: ${await Conversation.countDocuments({ status: 'resolved' })}`);
    console.log(`Escalated: ${await Conversation.countDocuments({ escalated: true })}`);
    
    if (conversations.length === 0) {
      console.log('\n⚠️  No conversations found in database!');
      console.log('\n💡 To create test conversations, you can:');
      console.log('   1. Send a WhatsApp message to your bot');
      console.log('   2. Run: node scripts/seedConversations.js');
    } else {
      console.log('\n📋 Recent Conversations:');
      console.log('='.repeat(60));
      conversations.forEach((conv, index) => {
        console.log(`\n${index + 1}. ${conv.customerName} (${conv.customerPhone})`);
        console.log(`   Status: ${conv.status}`);
        console.log(`   Messages: ${conv.messages.length}`);
        console.log(`   Created: ${conv.createdAt.toLocaleString()}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkConversations();

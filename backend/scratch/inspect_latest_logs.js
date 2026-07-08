const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const Conversation = require('../models/Conversation');
  const conversations = await Conversation.find({}).sort({ updatedAt: -1 }).limit(1);

  if (conversations.length > 0) {
    const convo = conversations[0];
    console.log('\n--- LATEST CONVERSATION ---');
    console.log('Customer Phone:', convo.customerPhone);
    console.log('Status:', convo.status);
    console.log('Bot Paused:', convo.botPaused);
    console.log('Messages (last 10):');
    convo.messages.slice(-10).forEach(m => {
      console.log(`[${m.role}] [${m.timestamp.toISOString()}] [${m.intent}]: ${m.content}`);
    });
  } else {
    console.log('No conversations found.');
  }

  const AILog = require('../models/AILog');
  const logs = await AILog.find({}).sort({ createdAt: -1 }).limit(3);
  
  console.log('\n--- LATEST AI LOGS ---');
  logs.forEach((log, index) => {
    console.log(`\nLog #${index + 1}:`);
    console.log('Intent:', log.intent);
    console.log('User Message:', log.userMessage);
    console.log('Assistant Message:', log.assistantMessage);
    console.log('System Prompt Snippet:', log.systemPrompt ? log.systemPrompt.slice(0, 200) + '...' : 'none');
    console.log('User Prompt Snippet:', log.userPrompt ? log.userPrompt.slice(0, 200) + '...' : 'none');
    console.log('Error:', log.error || 'none');
  });

  await mongoose.disconnect();
}

main().catch(err => console.error(err));

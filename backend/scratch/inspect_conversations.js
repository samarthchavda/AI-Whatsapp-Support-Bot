const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Conversation = require('../models/Conversation');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const convos = await Conversation.find({}).sort({ updatedAt: -1 }).limit(10);
    console.log('Recent Conversations:', convos.length);
    for (const c of convos) {
      console.log(`- Customer: ${c.customerPhone}`);
      console.log(`  Name: ${c.customerName}`);
      console.log(`  Messages Count: ${c.messages?.length || 0}`);
      console.log(`  Updated: ${c.updatedAt}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();

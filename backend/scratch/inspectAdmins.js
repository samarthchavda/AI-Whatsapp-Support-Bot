const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const KnowledgeBase = require('../models/KnowledgeBase');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const admins = await Admin.find({});
    console.log(`📊 Found ${admins.length} Admin users:`);
    for (const a of admins) {
      const kbs = await KnowledgeBase.find({ uploadedBy: a._id });
      console.log(`----------------------------------------`);
      console.log(`Email: ${a.email}`);
      console.log(`Name: ${a.name}`);
      console.log(`whatsappPhoneNumberId: ${a.whatsappPhoneNumberId}`);
      console.log(`whatsappBusinessAccountId: ${a.whatsappBusinessAccountId}`);
      console.log(`whatsappAccessToken: ${a.whatsappAccessToken ? 'PRESENT (len: ' + a.whatsappAccessToken.length + ')' : 'MISSING'}`);
      console.log(`whatsappConnected: ${a.whatsappConnected}`);
      console.log(`Knowledge Base Docs Count: ${kbs.length}`);
      for (const kb of kbs) {
        console.log(`   * KB Title: ${kb.title}`);
        console.log(`     Snippet: ${kb.extractedText ? kb.extractedText.substring(0, 300).replace(/\n/g, ' ') + '...' : 'NONE'}`);
      }
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();

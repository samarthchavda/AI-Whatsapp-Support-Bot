const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const Admin = require('../models/Admin');
  const admin = await Admin.findOne({ email: 'chavdasamarth02@gmail.com' });
  
  if (admin) {
    console.log('Admin details:');
    console.log('Email:', admin.email);
    console.log('whatsappConnected:', admin.whatsappConnected);
    console.log('whatsappPhoneNumberId:', admin.whatsappPhoneNumberId);
    console.log('whatsappBusinessAccountId:', admin.whatsappBusinessAccountId);
  } else {
    console.log('No admin found with email chavdasamarth02@gmail.com');
  }

  const Conversation = require('../models/Conversation');
  const convo = await Conversation.findOne({ customerPhone: '918128420287' });
  
  if (convo) {
    console.log('\nConversation details:');
    console.log('Status:', convo.status);
    console.log('Bot Paused:', convo.botPaused);
  }

  await mongoose.disconnect();
}

main().catch(err => console.error(err));

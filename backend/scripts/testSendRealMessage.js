require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');

const numbers = ['9054167563', '9227420287', '8128420287'];
const messageText = "Hello from Kwickbot AI! 🚀 Your official WhatsApp Business API connection is active and working!";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find active merchant admin with connected WhatsApp
    const admin = await Admin.findOne({ whatsappConnected: true, whatsappAccessToken: { $exists: true } });
    if (!admin) {
      console.error('❌ No connected WhatsApp Admin found in database.');
      process.exit(1);
    }

    console.log(`📱 Using connected WhatsApp Merchant: ${admin.name} (${admin.whatsappDisplayPhoneNumber || 'N/A'})`);
    console.log(`🔑 WABA ID: ${admin.whatsappBusinessAccountId}, Phone ID: ${admin.whatsappPhoneNumberId}`);

    const credentials = {
      accessToken: admin.whatsappAccessToken,
      phoneNumberId: admin.whatsappPhoneNumberId,
      businessAccountId: admin.whatsappBusinessAccountId
    };

    for (const rawNum of numbers) {
      console.log(`\n📤 Attempting to send test WhatsApp message to: ${rawNum}...`);
      const result = await whatsappCloudAPI.sendMessage(rawNum, messageText, credentials);
      if (result.success) {
        console.log(`🎉 SUCCESS! Message sent to ${rawNum} (Message ID: ${result.messageId})`);
      } else {
        console.error(`❌ FAILED for ${rawNum}:`, result.error);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing test message send:', err);
    process.exit(1);
  }
};

run();

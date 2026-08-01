require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const axios = require('axios');
const Admin = require('../models/Admin');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');

const numbers = ['9054167563', '9227420287', '8128420287'];
const messageText = "Hello from Kwickbot AI! 🚀 Your official WhatsApp Business API connection is active and working!";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all active merchant admins with connected WhatsApp
    const admins = await Admin.find({ whatsappAccessToken: { $exists: true, $ne: null } });
    if (!admins || admins.length === 0) {
      console.error('❌ No connected WhatsApp Admin found in database.');
      process.exit(1);
    }

    console.log(`📱 Found ${admins.length} merchant admins connected to WhatsApp in DB.`);
    for (const admin of admins) {
      console.log(`\n========================================`);
      console.log(`👤 Merchant: ${admin.name} (${admin.email})`);
      console.log(`📱 Phone Display: ${admin.whatsappDisplayPhoneNumber || 'N/A'}, Phone ID: ${admin.whatsappPhoneNumberId}`);
      console.log(`🔑 WABA ID: ${admin.whatsappBusinessAccountId}`);

      const credentials = {
        accessToken: admin.whatsappAccessToken,
        phoneNumberId: admin.whatsappPhoneNumberId,
        businessAccountId: admin.whatsappBusinessAccountId
      };

      // Register phone number status with Meta to clear Error #133010 Account Not Registered
      try {
        console.log(`\n⚙️ Registering Phone Number ID ${admin.whatsappPhoneNumberId} with Meta Messaging Server...`);
        const regRes = await axios.post(
          `https://graph.facebook.com/v25.0/${admin.whatsappPhoneNumberId}/register`,
          {
            messaging_product: 'whatsapp',
            pin: '123456'
          },
          {
            headers: {
              'Authorization': `Bearer ${admin.whatsappAccessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('✅ Meta Phone Registration Success:', regRes.data);
      } catch (regErr) {
        console.warn('⚠️ Meta Phone Registration Response:', regErr.response?.data || regErr.message);
      }

      for (const rawNum of numbers) {
        console.log(`\n📤 Attempting to send test WhatsApp message to: ${rawNum}...`);
        const result = await whatsappCloudAPI.sendMessage(rawNum, messageText, credentials);
        if (result.success) {
          console.log(`🎉 SUCCESS! Message sent to ${rawNum} (Message ID: ${result.messageId})`);
        } else {
          console.error(`❌ FAILED for ${rawNum}:`, result.error);
        }
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing test message send:', err);
    process.exit(1);
  }
};

run();

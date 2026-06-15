const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'chavdasamarth02@gmail.com';
    const admin = await Admin.findOne({ email });

    if (!admin) {
      console.error(`❌ Admin not found: ${email}`);
      return;
    }

    console.log(`Before update:`, {
      email: admin.email,
      whatsappPhoneNumberId: admin.whatsappPhoneNumberId,
      whatsappBusinessAccountId: admin.whatsappBusinessAccountId,
      whatsappConnected: admin.whatsappConnected
    });

    admin.whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    admin.whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    admin.whatsappBusinessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    admin.whatsappConnected = true;
    admin.whatsappConnectedAt = new Date();

    await admin.save();
    console.log('✅ Admin credentials updated successfully!');

    const updated = await Admin.findOne({ email });
    console.log(`After update:`, {
      email: updated.email,
      whatsappPhoneNumberId: updated.whatsappPhoneNumberId,
      whatsappBusinessAccountId: updated.whatsappBusinessAccountId,
      whatsappConnected: updated.whatsappConnected
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();

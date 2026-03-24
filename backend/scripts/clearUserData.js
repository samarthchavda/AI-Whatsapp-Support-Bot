const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const ReturnPolicy = require('../models/ReturnPolicy');
const PaymentPolicy = require('../models/PaymentPolicy');
const Conversation = require('../models/Conversation');
const Escalation = require('../models/Escalation');
const AILog = require('../models/AILog');
const Counter = require('../models/Counter');
require('dotenv').config();

const clearUserData = async () => {
  try {
    console.log('🧹 Starting user data cleanup...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Clear all database collections
    const deleteResults = await Promise.all([
      Order.deleteMany({}),
      Invoice.deleteMany({}),
      Customer.deleteMany({}),
      ReturnPolicy.deleteMany({}),
      PaymentPolicy.deleteMany({}),
      Conversation.deleteMany({}),
      Escalation.deleteMany({}),
      AILog.deleteMany({}),
      Counter.deleteMany({})
    ]);

    console.log('🗑️  Cleared MongoDB collections:');
    console.log(`   - Orders: ${deleteResults[0].deletedCount}`);
    console.log(`   - Invoices: ${deleteResults[1].deletedCount}`);
    console.log(`   - Customers: ${deleteResults[2].deletedCount}`);
    console.log(`   - Return Policies: ${deleteResults[3].deletedCount}`);
    console.log(`   - Payment Policies: ${deleteResults[4].deletedCount}`);
    console.log(`   - Conversations: ${deleteResults[5].deletedCount}`);
    console.log(`   - Escalations: ${deleteResults[6].deletedCount}`);
    console.log(`   - AI Logs: ${deleteResults[7].deletedCount}`);
    console.log(`   - Counters: ${deleteResults[8].deletedCount}`);

    // Clear WhatsApp session data
    const authPath = path.join(__dirname, '../.wwebjs_auth');
    const cachePath = path.join(__dirname, '../.wwebjs_cache');

    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('\n🗑️  Cleared WhatsApp authentication data');
    }

    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log('🗑️  Cleared WhatsApp cache data');
    }

    console.log('\n✨ All user data has been cleared successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npm run seed (to add demo data)');
    console.log('   2. Start the bot: npm run dev');
    console.log('   3. Scan QR code to authenticate WhatsApp\n');

    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error clearing user data:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

clearUserData();

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Integration = require('../models/Integration');
const shopifyOrderSyncService = require('../services/shopifyOrderSyncService');

const email = 'chavdasamarth007@gmail.com';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.error(`❌ Admin ${email} not found.`);
      process.exit(1);
    }

    const integration = await Integration.findOne({ adminId: admin._id, platform: 'shopify' });
    if (!integration) {
      console.error(`❌ No Shopify integration found for ${email}.`);
      process.exit(1);
    }

    console.log(`🚀 Triggering Shopify Sync for ${integration.storeUrl}...`);
    const summary = await shopifyOrderSyncService.syncIntegrationOrders(integration);
    console.log(`✅ Sync Completed Summary:`, summary);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error triggering Shopify sync:', err);
    process.exit(1);
  }
};

run();

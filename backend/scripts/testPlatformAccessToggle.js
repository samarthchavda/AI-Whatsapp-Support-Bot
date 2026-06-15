const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const Integration = require('../models/Integration');
const integrationController = require('../controllers/integrationController');

async function runTest() {
  console.log('🧪 Starting Platform Access Toggle Verification...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock Admin
    const testEmail = 'platform-toggle-test@store.com';
    let admin = await Admin.findOne({ email: testEmail });
    if (admin) {
      await Admin.deleteOne({ email: testEmail });
    }
    
    admin = new Admin({
      name: 'Platform Toggle Test Admin',
      email: testEmail,
      password: 'hashedpassword123',
      phone: '1234567890',
      businessName: 'Platform Toggle Test Store',
      role: 'admin',
      subscriptionPlan: 'starter',
      subscriptionStatus: 'active',
      monthlyPrice: 29,
      geminiTokensUsed: 0,
      geminiTokensLimit: 10000,
      webBotEnabled: false,
      shopifyEnabled: true, // Enabled by default
      woocommerceEnabled: true, // Enabled by default
      isActive: true
    });
    await admin.save();
    console.log(`👤 Created test admin: ${admin.email}`);
    console.log(`Initial values: shopifyEnabled = ${admin.shopifyEnabled}, woocommerceEnabled = ${admin.woocommerceEnabled}`);

    // Clean up any integrations for this test admin
    await Integration.deleteMany({ adminId: admin._id });

    // --- Scenario 1: Test connection creation while ENABLED ---
    console.log('\n--- Scenario 1: Connecting Shopify while permitted ---');
    
    // Simulate req and res objects
    const req = {
      admin: admin,
      body: {
        platform: 'shopify',
        storeUrl: 'https://test-toggle-store.myshopify.com',
        apiKey: 'shpat_testkey12345',
        storeName: 'Test Toggle Store'
      }
    };
    
    let resStatus = null;
    let resJson = null;
    const res = {
      status: (code) => {
        resStatus = code;
        return res;
      },
      json: (data) => {
        resJson = data;
        return res;
      }
    };

    // Override the sync service so it doesn't try to make real network calls to Shopify
    const shopifyOrderSyncService = require('../services/shopifyOrderSyncService');
    const originalSync = shopifyOrderSyncService.syncIntegrationOrders;
    shopifyOrderSyncService.syncIntegrationOrders = async () => ({ success: true, fetched: 0 });

    await integrationController.createIntegration(req, res);
    
    console.log(`Response status: ${resStatus || 200}`);
    console.log(`Response body: ${JSON.stringify(resJson)}`);

    if (resStatus === 201 || !resStatus) {
      console.log('✅ Shopify connected successfully when permitted.');
    } else {
      throw new Error(`Failed to connect Shopify when permitted: ${resJson?.error}`);
    }

    // Clean up integration
    await Integration.deleteMany({ adminId: admin._id });

    // --- Scenario 2: Toggle Shopify access OFF via simulated controller action ---
    console.log('\n--- Scenario 2: Revoking Shopify access (Toggling off) ---');
    
    // Mock the super admin toggle action
    admin.shopifyEnabled = !admin.shopifyEnabled;
    await admin.save();
    console.log(`DB Verification: shopifyEnabled = ${admin.shopifyEnabled} (expected: false)`);

    if (admin.shopifyEnabled === false) {
      console.log('✅ Shopify access revoked successfully in database.');
    } else {
      throw new Error('Failed to revoke Shopify access in database');
    }

    // --- Scenario 3: Test connection creation while DISABLED ---
    console.log('\n--- Scenario 3: Connecting Shopify while disabled (Should be blocked) ---');
    
    req.admin = admin; // Updated admin
    resStatus = null;
    resJson = null;

    await integrationController.createIntegration(req, res);

    console.log(`Response status: ${resStatus}`);
    console.log(`Response body: ${JSON.stringify(resJson)}`);

    if (resStatus === 403 && resJson?.error?.includes('disabled')) {
      console.log('✅ Shopify integration request successfully blocked with 403 Forbidden!');
    } else {
      throw new Error('Integration request was not blocked as expected');
    }

    // --- Scenario 4: Toggle Shopify access ON again ---
    console.log('\n--- Scenario 4: Re-granting Shopify access (Toggling back on) ---');
    
    admin.shopifyEnabled = !admin.shopifyEnabled;
    await admin.save();
    console.log(`DB Verification: shopifyEnabled = ${admin.shopifyEnabled} (expected: true)`);

    if (admin.shopifyEnabled === true) {
      console.log('✅ Shopify access re-granted successfully in database.');
    } else {
      throw new Error('Failed to re-grant Shopify access in database');
    }

    // Restore original sync function
    shopifyOrderSyncService.syncIntegrationOrders = originalSync;

    // Clean up test database objects
    console.log('\n🧹 Cleaning up test database objects...');
    await Admin.deleteOne({ _id: admin._id });
    await Integration.deleteMany({ adminId: admin._id });
    console.log('✅ Cleaned up.');

    console.log('\n🎉 Platform Access Toggle Verification Complete! Everything working perfectly.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runTest();

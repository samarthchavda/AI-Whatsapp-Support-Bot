const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const subscriptionService = require('../services/subscriptionService');

async function seedAndTest() {
  console.log('🧪 Seeding and Testing Subscription Tiers...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    const usersToSeed = [
      {
        email: 'chavdasamarth007@gmail.com',
        name: 'Samarth Starter',
        plan: 'starter',
        phone: '15550000007',
        businessName: 'Samarth Starter Shop'
      },
      {
        email: 'chavdasamarth002@gmail.com',
        name: 'Samarth Pro',
        plan: 'professional',
        phone: '15550000002',
        businessName: 'Samarth Professional Shop'
      },
      {
        email: 'samarthchavda132@gmail.com',
        name: 'Samarth Enterprise',
        plan: 'enterprise',
        phone: '15550000132',
        businessName: 'Samarth Enterprise Shop'
      }
    ];

    const seededAdmins = [];

    for (const u of usersToSeed) {
      // Clean up existing user if any
      await Admin.deleteOne({ email: u.email });

      // Create new admin
      const admin = new Admin({
        name: u.name,
        email: u.email,
        password: 'Password123!', // Hashed automatically by pre-save schema hook
        role: 'admin',
        businessPhone: u.phone,
        businessName: u.businessName,
        subscriptionPlan: u.plan,
        subscriptionStatus: 'active',
        monthlyPrice: u.plan === 'starter' ? 29 : u.plan === 'professional' ? 79 : 199,
        isActive: true,
        whatsappConnected: false,
        geminiTokensUsed: 0,
        totalMessagesProcessed: 0,
        limitNotificationSent: false
      });

      await admin.save();
      console.log(`👤 Seeded User: ${admin.email} | Plan: ${admin.subscriptionPlan} | Password: Password123!`);
      seededAdmins.push(admin);
    }

    console.log('\n--- Running Subscription Limits Verification ---');

    // Test Starter Plan Limits
    const starterAdmin = seededAdmins[0];
    console.log(`\n📋 Verifying ${starterAdmin.subscriptionPlan.toUpperCase()} limits...`);
    
    // Set variables under limit
    starterAdmin.totalMessagesProcessed = 499;
    starterAdmin.geminiTokensUsed = 99999;
    let limitCheck = subscriptionService.checkLimitExceeded(starterAdmin);
    console.log(`   Under Limit (499 msg, 99999 tokens) -> Exceeded: ${limitCheck.exceeded} (Expected: false)`);
    if (limitCheck.exceeded) throw new Error('Starter under-limit check failed');

    // Hit message limit
    starterAdmin.totalMessagesProcessed = 500;
    limitCheck = subscriptionService.checkLimitExceeded(starterAdmin);
    console.log(`   Message Limit Reached (500 msg) -> Exceeded: ${limitCheck.exceeded} | Reason: ${limitCheck.reason} (Expected: true)`);
    if (!limitCheck.exceeded || !limitCheck.reason.includes('Message limit')) throw new Error('Starter message limit breach check failed');

    // Hit token limit
    starterAdmin.totalMessagesProcessed = 0;
    starterAdmin.geminiTokensUsed = 100000;
    limitCheck = subscriptionService.checkLimitExceeded(starterAdmin);
    console.log(`   Token Limit Reached (100000 tokens) -> Exceeded: ${limitCheck.exceeded} | Reason: ${limitCheck.reason} (Expected: true)`);
    if (!limitCheck.exceeded || !limitCheck.reason.includes('Token limit')) throw new Error('Starter token limit breach check failed');


    // Test Professional Plan Limits
    const proAdmin = seededAdmins[1];
    console.log(`\n📋 Verifying ${proAdmin.subscriptionPlan.toUpperCase()} limits...`);
    
    // Set variables under limit
    proAdmin.totalMessagesProcessed = 2499;
    proAdmin.geminiTokensUsed = 499999;
    limitCheck = subscriptionService.checkLimitExceeded(proAdmin);
    console.log(`   Under Limit (2499 msg, 499999 tokens) -> Exceeded: ${limitCheck.exceeded} (Expected: false)`);
    if (limitCheck.exceeded) throw new Error('Professional under-limit check failed');

    // Hit message limit
    proAdmin.totalMessagesProcessed = 2500;
    limitCheck = subscriptionService.checkLimitExceeded(proAdmin);
    console.log(`   Message Limit Reached (2500 msg) -> Exceeded: ${limitCheck.exceeded} | Reason: ${limitCheck.reason} (Expected: true)`);
    if (!limitCheck.exceeded || !limitCheck.reason.includes('Message limit')) throw new Error('Professional message limit breach check failed');

    // Hit token limit
    proAdmin.totalMessagesProcessed = 0;
    proAdmin.geminiTokensUsed = 500000;
    limitCheck = subscriptionService.checkLimitExceeded(proAdmin);
    console.log(`   Token Limit Reached (500000 tokens) -> Exceeded: ${limitCheck.exceeded} | Reason: ${limitCheck.reason} (Expected: true)`);
    if (!limitCheck.exceeded || !limitCheck.reason.includes('Token limit')) throw new Error('Professional token limit breach check failed');


    // Test Enterprise Plan Limits
    const enterpriseAdmin = seededAdmins[2];
    console.log(`\n📋 Verifying ${enterpriseAdmin.subscriptionPlan.toUpperCase()} limits...`);
    
    // Set variables under limit
    enterpriseAdmin.totalMessagesProcessed = 9999;
    enterpriseAdmin.geminiTokensUsed = 1999999;
    limitCheck = subscriptionService.checkLimitExceeded(enterpriseAdmin);
    console.log(`   Under Limit (9999 msg, 1999999 tokens) -> Exceeded: ${limitCheck.exceeded} (Expected: false)`);
    if (limitCheck.exceeded) throw new Error('Enterprise under-limit check failed');

    // Hit message limit
    enterpriseAdmin.totalMessagesProcessed = 10000;
    limitCheck = subscriptionService.checkLimitExceeded(enterpriseAdmin);
    console.log(`   Message Limit Reached (10000 msg) -> Exceeded: ${limitCheck.exceeded} | Reason: ${limitCheck.reason} (Expected: true)`);
    if (!limitCheck.exceeded || !limitCheck.reason.includes('Message limit')) throw new Error('Enterprise message limit breach check failed');

    // Hit token limit
    enterpriseAdmin.totalMessagesProcessed = 0;
    enterpriseAdmin.geminiTokensUsed = 2000000;
    limitCheck = subscriptionService.checkLimitExceeded(enterpriseAdmin);
    console.log(`   Token Limit Reached (2000000 tokens) -> Exceeded: ${limitCheck.exceeded} | Reason: ${limitCheck.reason} (Expected: true)`);
    if (!limitCheck.exceeded || !limitCheck.reason.includes('Token limit')) throw new Error('Enterprise token limit breach check failed');

    console.log('\n🎉 ALL SUBSCRIPTION ENFORCEMENT CHECKS PASSED SUCCESSFULLY! 🎉');

    console.log('\n🔐 Seeding completed. You can use the following credentials to log in:');
    console.log('------------------------------------------------------------------');
    for (const admin of seededAdmins) {
      console.log(`📧 Email: ${admin.email}`);
      console.log(`🔑 Password: Password123!`);
      console.log(`📦 Subscription Plan: ${admin.subscriptionPlan}`);
      console.log('------------------------------------------------------------------');
    }

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedAndTest();

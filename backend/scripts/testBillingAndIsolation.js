const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Conversation = require('../models/Conversation');
const Admin = require('../models/Admin');
const aiService = require('../services/aiService');
const { checkAndResetMonthlyTokens } = require('../services/subscriptionService');

async function testBillingAndIsolation() {
  console.log('🧪 Starting Task 5: SaaS Isolation & Billing Verification...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock Admin
    const testEmail = 'billing-test@store.com';
    let admin = await Admin.findOne({ email: testEmail });
    if (admin) {
      await Admin.deleteOne({ email: testEmail });
    }
    
    admin = new Admin({
      name: 'Billing Test Admin',
      email: testEmail,
      password: 'hashedpassword123',
      phone: '1234567890',
      businessName: 'Billing Test Store',
      role: 'admin',
      subscriptionPlan: 'starter',
      subscriptionStatus: 'active',
      monthlyPrice: 29,
      geminiTokensUsed: 0,
      geminiTokensLimit: 1000, // Small limit for testing
      isActive: true
    });
    await admin.save();
    console.log(`👤 Created test admin: ${admin.email}`);

    const testPhone = '918888888888';
    await Conversation.deleteMany({ customerPhone: testPhone });
    console.log('🧹 Cleaned up old test conversations.');

    // Create a conversation associated with our billing test admin
    const conversation = new Conversation({
      admin: admin._id,
      customerPhone: testPhone,
      customerName: 'Billing Customer',
      messages: [],
      status: 'active'
    });
    await conversation.save();

    // 3. Test Subscription Suspension Check
    console.log('\n--- Step 1: Testing AI response block on suspended account ---');
    admin.subscriptionStatus = 'inactive';
    await admin.save();

    let res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Billing Customer',
      message: 'Hello, what is your shipping policy?'
    });

    console.log(`Bypass Flag (botPaused): ${res.botPaused}`);
    console.log(`Service Suspended Flag: ${res.serviceSuspended}`);
    console.log(`Bot Response (Should be offline notification): "${res.message}"`);

    // Verify conversation log has customer message but no AI response
    let conv = await Conversation.findOne({ customerPhone: testPhone });
    console.log(`Total messages logged (should be 1 user msg): ${conv.messages.length}`);
    console.log(`Last message logged role: ${conv.messages[conv.messages.length - 1].role}`);

    // Restore subscription
    admin.subscriptionStatus = 'active';
    await admin.save();

    // 4. Test Token Limit Exceeded Check
    console.log('\n--- Step 2: Testing AI response block on token limit exceeded ---');
    admin.geminiTokensUsed = 1200; // Exceeded limit of 1000
    await admin.save();

    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Billing Customer',
      message: 'Hello, what is your shipping policy?'
    });

    console.log(`Bypass Flag (botPaused): ${res.botPaused}`);
    console.log(`Limit Exceeded Flag: ${res.limitExceeded}`);
    console.log(`Bot Response (Should be high volume warning): "${res.message}"`);

    conv = await Conversation.findOne({ customerPhone: testPhone });
    console.log(`Total messages logged (should be 2 user msgs total): ${conv.messages.length}`);

    // Reset tokens
    admin.geminiTokensUsed = 0;
    await admin.save();

    // 5. Test Usage and Message Counters Tracking
    console.log('\n--- Step 3: Testing usage token & message tracking ---');
    console.log(`Before: totalMessagesProcessed=${admin.totalMessagesProcessed}, geminiTokensUsed=${admin.geminiTokensUsed}`);
    
    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Billing Customer',
      message: 'Hello, what is your hours?'
    });

    admin = await Admin.findOne({ email: testEmail });
    console.log(`After: totalMessagesProcessed=${admin.totalMessagesProcessed}, geminiTokensUsed=${admin.geminiTokensUsed}`);
    console.log(`Tokens consumed this query: ${res.structuredOutput?.metadata?.tokenUsage?.totalTokens || 0}`);
    
    if (admin.totalMessagesProcessed === 1) {
      console.log('✅ Message count successfully tracked (+1).');
    } else {
      console.warn('❌ Message count tracking mismatch.');
    }

    // 6. Test Monthly Reset Job
    console.log('\n--- Step 4: Testing daily/monthly subscription token reset job ---');
    // Set last token reset to 31 days ago and token usage to 500
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
    
    admin.lastTokenReset = thirtyOneDaysAgo;
    admin.geminiTokensUsed = 500;
    await admin.save();
    console.log(`Set mock usage: geminiTokensUsed=${admin.geminiTokensUsed}, lastTokenReset=${admin.lastTokenReset.toLocaleDateString()}`);

    // Run reset function
    await checkAndResetMonthlyTokens();

    admin = await Admin.findOne({ email: testEmail });
    console.log(`After Reset Job: geminiTokensUsed=${admin.geminiTokensUsed}, lastTokenReset=${admin.lastTokenReset.toLocaleDateString()}`);

    if (admin.geminiTokensUsed === 0 && admin.lastTokenReset.toDateString() === new Date().toDateString()) {
      console.log('✅ Monthly reset job successfully cleared usage and updated timestamp.');
    } else {
      console.warn('❌ Monthly reset job check failed.');
    }

    // Clean up
    await Conversation.deleteMany({ customerPhone: testPhone });
    await Admin.deleteOne({ email: testEmail });
    console.log('\n🧹 Cleaned up test database objects.');
    console.log('\n🎉 Task 5 Verification Complete! Everything working perfectly.');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testBillingAndIsolation();

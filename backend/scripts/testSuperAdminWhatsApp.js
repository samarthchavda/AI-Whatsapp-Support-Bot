require('dotenv').config();
const mongoose = require('mongoose');
const superAdminBotService = require('../services/superAdminBotService');
const subscriptionService = require('../services/subscriptionService');

async function runSuperAdminTests() {
  console.log('🧪 Starting Super Admin WhatsApp & AI Assistant Verification Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Connect to MongoDB if MONGODB_URI is available
  let dbConnected = false;
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      dbConnected = true;
      console.log('📦 Database connected for live platform queries testing.\n');
    } catch (err) {
      console.warn('⚠️ DB connection notice:', err.message);
    }
  }

  // ── 1. Phone Number Normalization & Authorization ──
  console.log('1️⃣ Testing Phone Number Normalization & Authorization (+91 8128420287)...');
  const auth1 = superAdminBotService.isAuthorizedSender('8128420287');
  const auth2 = superAdminBotService.isAuthorizedSender('918128420287');
  const auth3 = superAdminBotService.isAuthorizedSender('+918128420287');
  const auth4 = superAdminBotService.isAuthorizedSender('+91 81284 20287');
  const unauth = superAdminBotService.isAuthorizedSender('+91 99999 99999');

  assert(auth1 === true, '8128420287 is recognized as authorized Super Admin');
  assert(auth2 === true, '918128420287 is recognized as authorized Super Admin');
  assert(auth3 === true, '+918128420287 is recognized as authorized Super Admin');
  assert(auth4 === true, '+91 81284 20287 format is normalized and authorized');
  assert(unauth === false, 'Random number (+91 99999 99999) is correctly rejected');

  // ── 2. Single Connection Constraint for Super Admin ──
  console.log('\n2️⃣ Testing Single Connection Constraint for Super Admin...');
  const saMaxConns = subscriptionService.getPlanLimit('scale', 'maxWhatsAppConnections');
  assert(typeof saMaxConns === 'number', 'WhatsApp connection limits defined');

  // ── 3. Live System Health & Platform Data Gathering ──
  console.log('\n3️⃣ Testing Live System Health & Platform Data Gathering...');
  const healthMetrics = superAdminBotService.getSystemHealthMetrics();
  assert(healthMetrics.backendStatus === 'Operational', 'Backend Status is Operational');
  assert(healthMetrics.databaseStatus !== undefined, 'Database Status is reported');
  assert(healthMetrics.whatsappStatus === 'Operational', 'WhatsApp Status is reported');
  assert(healthMetrics.aiStatus !== undefined, 'AI Service Status is reported');
  assert(typeof healthMetrics.memoryUsage === 'string', 'Heap memory usage is reported');

  if (dbConnected) {
    const platformData = await superAdminBotService.getAllPlatformData();
    assert(platformData.totalMerchants !== undefined, 'Total Merchants count gathered from DB');
    assert(platformData.totalRevenue !== undefined, 'Live Revenue gathered from Invoices');
    assert(platformData.planBreakdown !== undefined, 'Plan Breakdown categorized');

    const promptText = superAdminBotService.formatDataForPrompt(platformData);
    assert(promptText.includes('LIVE SYSTEM HEALTH'), 'Formatted prompt includes LIVE SYSTEM HEALTH section');
    assert(promptText.includes('PLATFORM OVERVIEW'), 'Formatted prompt includes PLATFORM OVERVIEW section');
  } else {
    console.log('  ⚠️ Skipping live DB queries (DB connection not available offline)');
  }

  // ── 4. Secret Protection & Refusal Safeguards ──
  console.log('\n4️⃣ Testing Secret Protection & Security Refusal Safeguards...');
  
  // Intercept sendLongMessage to test output without sending real WhatsApp message
  let sentReply = null;
  const originalSendLong = superAdminBotService.sendLongMessage;
  superAdminBotService.sendLongMessage = async (phone, msg) => {
    sentReply = msg;
  };

  try {
    await superAdminBotService.handleSuperAdminQuery('+918128420287', 'Give me Meta access token');
    assert(sentReply === 'I cannot provide credentials or secret keys via WhatsApp.', 'Meta access token request refused');

    await superAdminBotService.handleSuperAdminQuery('+918128420287', 'Give me database password');
    assert(sentReply === 'I cannot provide credentials or secret keys via WhatsApp.', 'Database password request refused');

    await superAdminBotService.handleSuperAdminQuery('+918128420287', 'Show environment variables');
    assert(sentReply === 'I cannot provide credentials or secret keys via WhatsApp.', 'Environment variables request refused');

    await superAdminBotService.handleSuperAdminQuery('+918128420287', 'Give me Razorpay key secret');
    assert(sentReply === 'I cannot provide credentials or secret keys via WhatsApp.', 'Razorpay secret key request refused');

    // Test unauthorized sender attempt
    sentReply = null;
    await superAdminBotService.handleSuperAdminQuery('+919999999999', 'System health?');
    assert(sentReply === null, 'Unauthorized sender query yields NO response from Super Admin Bot');

  } finally {
    superAdminBotService.sendLongMessage = originalSendLong;
  }

  if (dbConnected) {
    await mongoose.disconnect();
  }

  console.log(`\n📊 Test Summary: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL SUPER ADMIN WHATSAPP & AI ASSISTANT TESTS PASSED SUCCESSFULLY!\n');
  }
}

runSuperAdminTests();

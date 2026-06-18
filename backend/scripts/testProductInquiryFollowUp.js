const mongoose = require('mongoose');
const path = require('path');

// Load env from project backend
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const Conversation = require('../models/Conversation');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const aiService = require('../services/aiService');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');
const whatsappWebBot = require('../services/whatsappWebBot');
const { runConversationPruning, runProductFollowUps } = require('../services/broadcastScheduler');

async function runTest() {
  console.log('🧪 Starting Automated Product Inquiry Recovery & Pruning Tests...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock Admin
    const testEmail = 'retargeting-test-admin@store.com';
    let admin = await Admin.findOne({ email: testEmail });
    if (admin) {
      await Admin.deleteOne({ email: testEmail });
    }
    
    admin = new Admin({
      name: 'Retargeting Test Admin',
      email: testEmail,
      password: 'hashedpassword123',
      businessPhone: '15550000000',
      businessName: 'GizmoStore',
      role: 'admin',
      subscriptionPlan: 'starter',
      subscriptionStatus: 'active',
      monthlyPrice: 29,
      isActive: true,
      whatsappConnected: true
    });
    await admin.save();
    console.log(`👤 Created test admin: ${admin.email}`);

    // Setup mock Customer
    await Customer.deleteMany({ admin: admin._id });
    const mockCustomer = new Customer({
      name: 'Samarth Client',
      phone: '15551234567',
      admin: admin._id
    });
    await mockCustomer.save();
    console.log(`👤 Created mock customer: ${mockCustomer.name}`);

    // Create a mock order to establish "known store products"
    await Order.deleteMany({ admin: admin._id });
    const mockOrder = new Order({
      orderId: 'ORD-MOCK-999',
      admin: admin._id,
      customerId: mockCustomer._id,
      customerPhone: '15551234567',
      customerName: 'Samarth Client',
      items: [
        { productName: 'Super Sound Pro Headphones', quantity: 1, price: 199.99 },
        { productName: 'Smart Charger Lite', quantity: 2, price: 29.99 }
      ],
      totalAmount: 259.97,
      status: 'delivered',
      paymentStatus: 'completed'
    });
    await mockOrder.save();
    console.log(`📦 Seeded mock order with products: "Super Sound Pro Headphones" and "Smart Charger Lite"`);

    // Clean up old conversations for this test admin
    await Conversation.deleteMany({ admin: admin._id });

    // Mock send functions
    let cloudApiSentCount = 0;
    let cloudApiSentMessages = [];
    const originalCloudSendMessage = whatsappCloudAPI.sendMessage;
    whatsappCloudAPI.sendMessage = async (phone, message, credentials) => {
      cloudApiSentCount++;
      cloudApiSentMessages.push({ phone, message });
      console.log(`[Mock CloudAPI Send] To: ${phone}, Message: "${message}"`);
      return { success: true, messageId: 'mock_wamid_999' };
    };

    const originalWebBotSendMessage = whatsappWebBot.sendMessage;
    let webBotSentCount = 0;
    whatsappWebBot.sendMessage = async (phone, message) => {
      webBotSentCount++;
      console.log(`[Mock WebBot Send] To: ${phone}, Message: "${message}"`);
      return { success: true };
    };

    // --- Step 1: Verify Gemini Product Inquiry Detection ---
    console.log('\n--- Step 1: Testing Product Inquiry Detection ---');
    const customerPhone = '15559876543';
    
    // Simulate user asking about headphones
    await aiService.processMessage({
      customerPhone,
      customerName: 'Samarth Client',
      message: 'Hi, do you guys have the Super Sound Pro Headphones in stock right now?',
      messageId: 'msg_inquiry_1',
      adminId: admin._id
    });

    // Fetch conversation from DB
    const conversation = await Conversation.findOne({ admin: admin._id, customerPhone });
    
    console.log('Conversation hasProductInquiry:', conversation.hasProductInquiry);
    console.log('Conversation inquiredProductName:', conversation.inquiredProductName);
    console.log('Conversation productInquiryAt:', conversation.productInquiryAt);

    if (conversation.hasProductInquiry && conversation.inquiredProductName) {
      console.log('✅ Step 1 Passed: Product inquiry successfully detected and name extracted!');
    } else {
      console.log('❌ Step 1 Failed: Product inquiry was not detected.');
    }

    // --- Step 2: Testing 14-day Conversation Auto-Pruning ---
    console.log('\n--- Step 2: Testing 14-day Conversation Auto-Pruning ---');
    
    // Create an old general conversation (15 days ago) without product inquiry
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const oldGeneralConv = new Conversation({
      admin: admin._id,
      customerPhone: '15550000001',
      customerName: 'Old General Customer',
      messages: [{ role: 'user', content: 'hello how are you' }],
      status: 'active'
    });
    await oldGeneralConv.save();
    // Force set updatedAt to 15 days ago in Mongo
    await Conversation.updateOne({ _id: oldGeneralConv._id }, { updatedAt: fifteenDaysAgo }, { timestamps: false });

    // Create an old product inquiry conversation (15 days ago) WITH product inquiry
    const oldProductConv = new Conversation({
      admin: admin._id,
      customerPhone: '15550000002',
      customerName: 'Old Product Customer',
      messages: [{ role: 'user', content: 'i want to buy headphones' }],
      status: 'active',
      hasProductInquiry: true,
      inquiredProductName: 'Super Sound Pro Headphones',
      productInquiryAt: fifteenDaysAgo,
      followUpSent: true
    });
    await oldProductConv.save();
    // Force set updatedAt to 15 days ago
    await Conversation.updateOne({ _id: oldProductConv._id }, { updatedAt: fifteenDaysAgo }, { timestamps: false });

    console.log('Running conversation pruning...');
    await runConversationPruning();

    // Verify which conversations remain
    const generalCheck = await Conversation.findById(oldGeneralConv._id);
    const productCheck = await Conversation.findById(oldProductConv._id);

    console.log('General conversation still exists?', !!generalCheck);
    console.log('Product inquiry conversation still exists?', !!productCheck);

    if (!generalCheck && productCheck) {
      console.log('✅ Step 2 Passed: General conversation deleted, product inquiry conversation preserved!');
    } else {
      console.log('❌ Step 2 Failed: Pruning rules did not execute correctly.');
    }

    // --- Step 3: Testing 7-day Retargeting Follow-ups ---
    console.log('\n--- Step 3: Testing 7-day Retargeting Follow-up Automation ---');
    
    // Create a conversation that inquired 8 days ago and has not received follow-up
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const followUpConv = new Conversation({
      admin: admin._id,
      customerPhone: '15557777777',
      customerName: 'John Followup',
      messages: [{ role: 'user', content: 'is the super sound pro headphones in stock?' }],
      status: 'active',
      hasProductInquiry: true,
      inquiredProductName: 'Super Sound Pro Headphones',
      productInquiryAt: eightDaysAgo,
      followUpSent: false
    });
    await followUpConv.save();
    // Set updatedAt to 8 days ago
    await Conversation.updateOne({ _id: followUpConv._id }, { updatedAt: eightDaysAgo }, { timestamps: false });

    console.log('Running daily follow-ups dispatcher...');
    await runProductFollowUps();

    // Fetch conversation again
    const updatedFollowUpConv = await Conversation.findById(followUpConv._id);
    console.log('Follow-up sent status after job:', updatedFollowUpConv.followUpSent);
    console.log('Follow-up sent timestamp:', updatedFollowUpConv.followUpSentAt);
    
    const lastMsg = updatedFollowUpConv.messages[updatedFollowUpConv.messages.length - 1];
    console.log('Last message role in transcript:', lastMsg?.role);
    console.log('Last message content contains "Super Sound Pro Headphones"?', lastMsg?.content.includes('Super Sound Pro Headphones'));
    console.log('Last message content contains related product recommendations ("Smart Charger Lite")?', lastMsg?.content.includes('Smart Charger Lite'));

    if (updatedFollowUpConv.followUpSent && lastMsg?.role === 'assistant' && cloudApiSentCount === 1) {
      console.log('✅ Step 3 Passed: Automated retargeting follow-up sent and documented successfully!');
    } else {
      console.log('❌ Step 3 Failed: Follow-up was not sent or not logged.');
    }

    // --- Clean Up DB Mocks & Restore Originals ---
    console.log('\n🧹 Cleaning up test database records...');
    await Admin.deleteOne({ _id: admin._id });
    await Customer.deleteMany({ admin: admin._id });
    await Order.deleteMany({ admin: admin._id });
    await Conversation.deleteMany({ admin: admin._id });
    
    whatsappCloudAPI.sendMessage = originalCloudSendMessage;
    whatsappWebBot.sendMessage = originalWebBotSendMessage;

    console.log('🎉 All Automated Product Inquiry Recovery tests completed!');

  } catch (error) {
    console.error('❌ Integration test failed with error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runTest();

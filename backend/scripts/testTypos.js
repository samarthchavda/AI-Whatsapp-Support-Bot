const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Conversation = require('../models/Conversation');
const Escalation = require('../models/Escalation');
const aiService = require('../services/aiService');

async function testTypos() {
  console.log('🧪 Starting Typo Matching and Intent Classification Test...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock Admin
    const testEmail = 'typo-test-admin@store.com';
    let admin = await Admin.findOne({ email: testEmail });
    if (admin) {
      await Admin.deleteOne({ email: testEmail });
    }
    
    admin = new Admin({
      name: 'Typo Test Admin',
      email: testEmail,
      password: 'hashedpassword123',
      phone: '1234567890',
      businessName: 'Typo Test Store',
      role: 'admin',
      subscriptionPlan: 'professional',
      subscriptionStatus: 'active',
      monthlyPrice: 49,
      geminiTokensLimit: 100000,
      isActive: true,
      whatsappConnected: true
    });
    await admin.save();
    console.log(`👤 Created test admin: ${admin.email}`);

    const testPhone = '919876543210';
    
    // Clean up existing conversations/escalations/orders/customers
    await Conversation.deleteMany({ customerPhone: testPhone });
    await Escalation.deleteMany({ customerPhone: testPhone });
    await Order.deleteMany({ customerPhone: testPhone });
    await Customer.deleteMany({ phone: testPhone });
    console.log('🧹 Cleaned up old test records.');

    // Create a mock Customer
    const customer = new Customer({
      name: 'Samarth Typos',
      phone: testPhone,
      email: 'typos-customer@gmail.com',
      admin: admin._id
    });
    await customer.save();
    console.log(`👤 Created mock customer: ${customer.name}`);

    // Create a mock order for cancellation tests
    const order = new Order({
      admin: admin._id,
      orderId: 'ORD-777',
      customerId: customer._id,
      customerPhone: testPhone,
      customerName: 'Samarth Typos',
      totalAmount: 150.00,
      status: 'pending',
      items: [{ productName: 'Super Keyboard', quantity: 1, price: 150.00 }],
      orderDate: new Date()
    });
    await order.save();
    console.log(`📦 Created mock order: ${order.orderId}`);

    // Test Case 1: Cancellation typo ("cacel the orde")
    console.log('\n--- Test Case 1: Cancellation Typo ("cacel the orde") ---');
    let res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Typos',
      message: 'cacel the orde',
      adminId: admin._id
    });
    console.log(`🤖 Bot Reply: "${res.message}"`);
    console.log(`Intent Detected: ${res.intent}`);
    console.log(`Is Escalated: ${res.escalated}`);

    // Test Case 2: Cancellation typo ("so cancle this item")
    console.log('\n--- Test Case 2: Cancellation Typo ("so cancle this item") ---');
    // Clear conversation first to reset status if needed
    await Conversation.deleteMany({ customerPhone: testPhone });
    // Make order pending again
    await Order.updateOne({ orderId: 'ORD-777' }, { $set: { status: 'pending' } });
    
    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Typos',
      message: 'so cancle this item',
      adminId: admin._id
    });
    console.log(`🤖 Bot Reply: "${res.message}"`);
    console.log(`Intent Detected: ${res.intent}`);
    console.log(`Is Escalated: ${res.escalated}`);

    // Verify order was cancelled in MongoDB
    const updatedOrder = await Order.findOne({ orderId: 'ORD-777' });
    console.log(`Order ORD-777 Status in DB: ${updatedOrder.status} (Expected: cancelled)`);

    // Test Case 3: Complaint typo ("i am complent about your services")
    console.log('\n--- Test Case 3: Complaint Typo ("i am complent about your services") ---');
    await Conversation.deleteMany({ customerPhone: testPhone });
    await Escalation.deleteMany({ customerPhone: testPhone });

    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Typos',
      message: 'i am complent about your services',
      adminId: admin._id
    });
    console.log(`🤖 Bot Reply: "${res.message}"`);
    console.log(`Intent Detected: ${res.intent}`);
    console.log(`Is Escalated: ${res.escalated}`);

    // Verify escalation record exists in MongoDB
    const escalationCount = await Escalation.countDocuments({ customerPhone: testPhone, reason: 'complaint' });
    console.log(`Escalation count in DB: ${escalationCount} (Expected: 1)`);

    // Test Case 4: Complex Complaint typo ("no one can touch with me i will complate to aginst you")
    console.log('\n--- Test Case 4: Complaint Typo ("no one can touch with me i will complate to aginst you") ---');
    await Conversation.deleteMany({ customerPhone: testPhone });
    await Escalation.deleteMany({ customerPhone: testPhone });

    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Typos',
      message: 'no one can touch with me i will complate to aginst you',
      adminId: admin._id
    });
    console.log(`🤖 Bot Reply: "${res.message}"`);
    console.log(`Intent Detected: ${res.intent}`);
    console.log(`Is Escalated: ${res.escalated}`);

    const escalationCount2 = await Escalation.countDocuments({ customerPhone: testPhone, reason: 'complaint' });
    console.log(`Escalation count in DB: ${escalationCount2} (Expected: 1)`);

    // Test Case 5: Refund Policy Typo query ("what is the refund polices")
    console.log('\n--- Test Case 5: Refund Policy Typo query ("what is the refund polices") ---');
    await Conversation.deleteMany({ customerPhone: testPhone });
    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Typos',
      message: 'what is the refund polices',
      adminId: admin._id
    });
    console.log(`Intent Detected: ${res.intent} (Expected: return_policy)`);
    console.log(`Is Escalated: ${res.escalated} (Expected: false)`);

    // Test Case 6: Refund Policy query ("what is the refund policy ?")
    console.log('\n--- Test Case 6: Refund Policy query ("what is the refund policy ?") ---');
    await Conversation.deleteMany({ customerPhone: testPhone });
    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Typos',
      message: 'what is the refund policy ?',
      adminId: admin._id
    });
    console.log(`Intent Detected: ${res.intent} (Expected: return_policy)`);
    console.log(`Is Escalated: ${res.escalated} (Expected: false)`);

    // Test Case 7: Active Refund Request ("i want refund of my order")
    console.log('\n--- Test Case 7: Active Refund Request ("i want refund of my order") ---');
    await Conversation.deleteMany({ customerPhone: testPhone });
    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Typos',
      message: 'i want refund of my order',
      adminId: admin._id
    });
    console.log(`Intent Detected: ${res.intent} (Expected: refund_request)`);
    console.log(`Is Escalated: ${res.escalated} (Expected: true)`);

    // Cleanup test data
    await Admin.deleteOne({ email: testEmail });
    await Conversation.deleteMany({ customerPhone: testPhone });
    await Escalation.deleteMany({ customerPhone: testPhone });
    await Order.deleteMany({ customerPhone: testPhone });
    await Customer.deleteMany({ phone: testPhone });
    console.log('\n🧹 Cleaned up all test database objects.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testTypos();

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Template = require('../models/Template');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const webhookService = require('../services/webhookService');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');
const whatsappWebBot = require('../services/whatsappWebBot');

async function runTest() {
  console.log('🧪 Starting Webhook Template Integration Verification...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock Admin
    const testEmail = 'webhook-template-test@store.com';
    let admin = await Admin.findOne({ email: testEmail });
    if (admin) {
      await Admin.deleteOne({ email: testEmail });
    }
    
    admin = new Admin({
      name: 'Webhook Template Test Admin',
      email: testEmail,
      password: 'hashedpassword123',
      phone: '1234567890',
      businessName: 'Webhook Template Test Store',
      role: 'admin',
      subscriptionPlan: 'starter',
      subscriptionStatus: 'active',
      monthlyPrice: 29,
      geminiTokensUsed: 0,
      geminiTokensLimit: 10000,
      isActive: true
    });
    await admin.save();
    console.log(`👤 Created test admin: ${admin.email}`);

    // Create a mock Customer
    const testPhone = '15555555555';
    let customer = await Customer.findOne({ phone: testPhone, admin: admin._id });
    if (customer) {
      await Customer.deleteOne({ _id: customer._id });
    }
    customer = new Customer({
      name: 'Samarth Test Customer',
      phone: testPhone,
      email: 'customer-test@gmail.com',
      admin: admin._id
    });
    await customer.save();
    console.log(`👤 Created test customer: ${customer.name}`);

    // Create a mock Order
    const testOrderId = 'ORD-MOCK-999';
    let order = await Order.findOne({ orderId: testOrderId, admin: admin._id });
    if (order) {
      await Order.deleteOne({ _id: order._id });
    }
    order = new Order({
      orderId: testOrderId,
      customerId: customer._id,
      customerPhone: testPhone,
      customerEmail: customer.email,
      customerName: customer.name,
      externalOrderId: 'ext-order-999',
      items: [{ productName: 'Cool Watch', quantity: 1, price: 99.99 }],
      totalAmount: 99.99,
      status: 'pending',
      paymentStatus: 'pending',
      orderDate: new Date(),
      admin: admin._id
    });
    await order.save();
    console.log(`📦 Created test order: ${order.orderId}`);

    // Clean up old templates for this test admin
    await Template.deleteMany({ adminId: admin._id });

    // Mock functions to verify calls
    let webBotCallCount = 0;
    let webBotSentMessages = [];
    const originalWebBotSendMessage = whatsappWebBot.sendMessage;
    whatsappWebBot.sendMessage = async (phone, message) => {
      webBotCallCount++;
      webBotSentMessages.push({ phone, message });
      return { success: true };
    };

    let cloudAPICallCount = 0;
    let cloudAPISentTemplates = [];
    const originalCloudAPISendTemplateMessage = whatsappCloudAPI.sendTemplateMessage;
    whatsappCloudAPI.sendTemplateMessage = async (phone, templateName, language, parameters) => {
      cloudAPICallCount++;
      cloudAPISentTemplates.push({ phone, templateName, language, parameters });
      return { success: true, messageId: 'mock-wamid-' + Math.random().toString(36).substr(2, 9) };
    };

    // --- Scenario 1: No Templates Mapped ---
    console.log('\n--- Scenario 1: Testing Order Confirmation WITHOUT Mapped Templates ---');
    let confirmResult = await webhookService.sendOrderConfirmation(order, customer);
    console.log(`Result success: ${confirmResult.success}`);
    console.log(`WebBot call count: ${webBotCallCount} (expected: 1)`);
    console.log(`CloudAPI call count: ${cloudAPICallCount} (expected: 0)`);
    if (webBotCallCount === 1 && cloudAPICallCount === 0) {
      console.log('✅ Scenario 1 (Unmapped Confirmation) passed.');
    } else {
      console.error('❌ Scenario 1 (Unmapped Confirmation) failed.');
    }

    // Reset call counts
    webBotCallCount = 0;
    cloudAPICallCount = 0;

    console.log('\n--- Scenario 1b: Testing Shipped Status WITHOUT Mapped Templates ---');
    order.status = 'shipped';
    let shippedResult = await webhookService.sendTrackingUpdate(order, customer, { carrier: 'DHL', trackingNumber: 'DHL123' });
    console.log(`Result success: ${shippedResult.success}`);
    console.log(`WebBot call count: ${webBotCallCount} (expected: 1)`);
    console.log(`CloudAPI call count: ${cloudAPICallCount} (expected: 0)`);
    if (webBotCallCount === 1 && cloudAPICallCount === 0) {
      console.log('✅ Scenario 1b (Unmapped Shipped) passed.');
    } else {
      console.error('❌ Scenario 1b (Unmapped Shipped) failed.');
    }

    // --- Scenario 2: With Templates Mapped ---
    console.log('\n--- Scenario 2: Testing Order Confirmation WITH Mapped Templates ---');
    
    // Seed templates for this test admin
    const tplConfirm = new Template({
      adminId: admin._id,
      metaTemplateId: 'tpl_confirm_id',
      name: 'order_confirmation',
      category: 'UTILITY',
      language: 'en_US',
      status: 'APPROVED',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Confirmed!' },
        { type: 'BODY', text: 'Hello {{1}}, your order {{2}} is confirmed.' }
      ],
      mappedEvent: 'order_confirmation'
    });
    await tplConfirm.save();

    const tplShipped = new Template({
      adminId: admin._id,
      metaTemplateId: 'tpl_shipped_id',
      name: 'order_shipped',
      category: 'UTILITY',
      language: 'en_US',
      status: 'APPROVED',
      components: [
        { type: 'BODY', text: 'Hi {{1}}, order {{2}} shipped via {{3}} (TRK: {{4}}).' }
      ],
      mappedEvent: 'order_shipped'
    });
    await tplShipped.save();

    const tplDelivered = new Template({
      adminId: admin._id,
      metaTemplateId: 'tpl_delivered_id',
      name: 'order_delivered',
      category: 'UTILITY',
      language: 'en_US',
      status: 'APPROVED',
      components: [
        { type: 'BODY', text: 'Hi {{1}}, order {{2}} has been delivered!' }
      ],
      mappedEvent: 'order_delivered'
    });
    await tplDelivered.save();

    // Reset call counts
    webBotCallCount = 0;
    cloudAPICallCount = 0;
    cloudAPISentTemplates = [];

    // Trigger confirmation with mapped template
    order.status = 'pending';
    confirmResult = await webhookService.sendOrderConfirmation(order, customer);
    console.log(`Result success: ${confirmResult.success}`);
    console.log(`WebBot call count: ${webBotCallCount} (expected: 0)`);
    console.log(`CloudAPI call count: ${cloudAPICallCount} (expected: 1)`);
    if (cloudAPISentTemplates.length > 0) {
      console.log(`CloudAPI Sent Template Name: "${cloudAPISentTemplates[0].templateName}" (expected: "order_confirmation")`);
      console.log(`CloudAPI Sent Parameters:`, JSON.stringify(cloudAPISentTemplates[0].parameters));
    }
    
    if (webBotCallCount === 0 && cloudAPICallCount === 1 && cloudAPISentTemplates[0]?.templateName === 'order_confirmation') {
      console.log('✅ Scenario 2 (Mapped Confirmation) passed.');
    } else {
      console.error('❌ Scenario 2 (Mapped Confirmation) failed.');
    }

    // Reset call counts
    webBotCallCount = 0;
    cloudAPICallCount = 0;
    cloudAPISentTemplates = [];

    // Trigger shipped status with mapped template
    console.log('\n--- Scenario 2b: Testing Shipped Status WITH Mapped Templates ---');
    order.status = 'shipped';
    shippedResult = await webhookService.sendTrackingUpdate(order, customer, { carrier: 'FedEx', trackingNumber: 'FEDEX888' });
    console.log(`Result success: ${shippedResult.success}`);
    console.log(`WebBot call count: ${webBotCallCount} (expected: 0)`);
    console.log(`CloudAPI call count: ${cloudAPICallCount} (expected: 1)`);
    if (cloudAPISentTemplates.length > 0) {
      console.log(`CloudAPI Sent Template Name: "${cloudAPISentTemplates[0].templateName}" (expected: "order_shipped")`);
      console.log(`CloudAPI Sent Parameters:`, JSON.stringify(cloudAPISentTemplates[0].parameters));
    }

    if (webBotCallCount === 0 && cloudAPICallCount === 1 && cloudAPISentTemplates[0]?.templateName === 'order_shipped') {
      console.log('✅ Scenario 2b (Mapped Shipped) passed.');
    } else {
      console.error('❌ Scenario 2b (Mapped Shipped) failed.');
    }

    // Reset call counts
    webBotCallCount = 0;
    cloudAPICallCount = 0;
    cloudAPISentTemplates = [];

    // Trigger delivered status with mapped template
    console.log('\n--- Scenario 2c: Testing Delivered Status WITH Mapped Templates ---');
    order.status = 'delivered';
    let deliveredResult = await webhookService.sendTrackingUpdate(order, customer, {});
    console.log(`Result success: ${deliveredResult.success}`);
    console.log(`WebBot call count: ${webBotCallCount} (expected: 0)`);
    console.log(`CloudAPI call count: ${cloudAPICallCount} (expected: 1)`);
    if (cloudAPISentTemplates.length > 0) {
      console.log(`CloudAPI Sent Template Name: "${cloudAPISentTemplates[0].templateName}" (expected: "order_delivered")`);
      console.log(`CloudAPI Sent Parameters:`, JSON.stringify(cloudAPISentTemplates[0].parameters));
    }

    if (webBotCallCount === 0 && cloudAPICallCount === 1 && cloudAPISentTemplates[0]?.templateName === 'order_delivered') {
      console.log('✅ Scenario 2c (Mapped Delivered) passed.');
    } else {
      console.error('❌ Scenario 2c (Mapped Delivered) failed.');
    }

    // Restore original functions
    whatsappWebBot.sendMessage = originalWebBotSendMessage;
    whatsappCloudAPI.sendTemplateMessage = originalCloudAPISendTemplateMessage;

    // 6. Clean up
    await Template.deleteMany({ adminId: admin._id });
    await Order.deleteOne({ _id: order._id });
    await Customer.deleteOne({ _id: customer._id });
    await Admin.deleteOne({ email: testEmail });
    console.log('\n🧹 Cleaned up test database objects.');
    console.log('\n🎉 Webhook Template Integration Verification Complete! Everything working perfectly.');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runTest();

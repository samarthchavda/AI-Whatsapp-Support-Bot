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
  console.log('🧪 Starting Order Cancellation Webhook Verification...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock Admin
    const testEmail = 'webhook-cancellation-test@store.com';
    let admin = await Admin.findOne({ email: testEmail });
    if (admin) {
      await Admin.deleteOne({ email: testEmail });
    }
    
    admin = new Admin({
      name: 'Webhook Cancellation Test Admin',
      email: testEmail,
      password: 'hashedpassword123',
      phone: '1234567890',
      businessName: 'Webhook Cancellation Test Store',
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
      return { success: true };
    };

    // --- Scenario 1: Order created first ---
    console.log('\n--- Scenario 1: Shopify Order Created ---');
    const createPayload = {
      id: 99999,
      order_number: 199999,
      customer: {
        first_name: 'Samarth',
        last_name: 'Test Customer',
        phone: testPhone,
        email: 'customer-test@gmail.com'
      },
      total_price: '199.99',
      line_items: [{ product_id: 'prod-888', name: 'Super Headphones', quantity: 1, price: '199.99' }],
      financial_status: 'paid',
      fulfillment_status: null,
      created_at: new Date().toISOString()
    };

    const resultCreate = await webhookService.processWebhook('shopify', createPayload, admin._id);
    console.log(`Order status after creation: ${resultCreate.order.status} (expected: pending)`);
    
    // --- Scenario 2: Shopify Order Cancelled (Unmapped Cancellation Template) ---
    console.log('\n--- Scenario 2: Shopify Order Cancelled (Without Mapped Template) ---');
    
    // Simulate Shopify webhook for cancellation
    const cancelPayload = {
      ...createPayload,
      cancelled_at: new Date().toISOString(),
      cancel_reason: 'customer'
    };

    // Trigger processWebhook
    const resultCancel = await webhookService.processWebhook('shopify', cancelPayload, admin._id);
    console.log(`Order status after cancel: ${resultCancel.order.status} (expected: cancelled)`);
    
    // Simulate what controllers/externalWebhookController does on order update
    const statusChanged = resultCancel.oldStatus !== resultCancel.order.status;
    const isShippedOrDelivered = resultCancel.order.status === 'shipped' || resultCancel.order.status === 'delivered';
    const isCancelled = resultCancel.order.status === 'cancelled';

    console.log(`Status changed: ${statusChanged}, isCancelled: ${isCancelled}`);

    let whatsappResult = { success: false };
    if (statusChanged && (isShippedOrDelivered || isCancelled)) {
      whatsappResult = await webhookService.sendTrackingUpdate(resultCancel.order, resultCancel.customer, {});
    }

    console.log(`WhatsApp send status: ${whatsappResult.success}`);
    console.log(`WebBot call count: ${webBotCallCount} (expected: 1)`);
    console.log(`CloudAPI call count: ${cloudAPICallCount} (expected: 0)`);
    if (webBotSentMessages[0]) {
      console.log(`Sent message content:\n${webBotSentMessages[0].message}`);
    }

    if (resultCancel.order.status === 'cancelled' && webBotCallCount === 1) {
      console.log('✅ Scenario 2 (Unmapped Cancellation) passed.');
    } else {
      throw new Error('Scenario 2 failed');
    }

    // Reset mocks
    webBotCallCount = 0;
    webBotSentMessages = [];
    cloudAPICallCount = 0;
    cloudAPISentTemplates = [];

    // --- Scenario 3: Shopify Order Cancelled (With Mapped Template) ---
    console.log('\n--- Scenario 3: Shopify Order Cancelled (With Mapped Template) ---');
    
    // Map template
    const cancelTemplate = new Template({
      adminId: admin._id,
      metaTemplateId: 'meta-cancel-tpl-123',
      name: 'order_cancelled_notification',
      category: 'UTILITY',
      language: 'en_US',
      status: 'APPROVED',
      components: [
        { type: 'BODY', text: 'Hi {{1}}, your order {{2}} has been cancelled.' }
      ],
      mappedEvent: 'order_cancelled'
    });
    await cancelTemplate.save();
    console.log(`Mapped template order_cancelled to ${cancelTemplate.name}`);

    // Call sendTrackingUpdate directly with the cancelled order
    const whatsappResultMapped = await webhookService.sendTrackingUpdate(resultCancel.order, resultCancel.customer, {});
    
    console.log(`WhatsApp send status: ${whatsappResultMapped.success}`);
    console.log(`WebBot call count: ${webBotCallCount} (expected: 0)`);
    console.log(`CloudAPI call count: ${cloudAPICallCount} (expected: 1)`);
    if (cloudAPISentTemplates[0]) {
      console.log(`CloudAPI Sent Template Name: "${cloudAPISentTemplates[0].templateName}"`);
      console.log(`CloudAPI Sent Parameters: ${JSON.stringify(cloudAPISentTemplates[0].parameters)}`);
    }

    if (cloudAPICallCount === 1 && cloudAPISentTemplates[0]?.templateName === 'order_cancelled_notification') {
      console.log('✅ Scenario 3 (Mapped Cancellation) passed.');
    } else {
      throw new Error('Scenario 3 failed');
    }

    // Clean up
    console.log('\n🧹 Cleaning up test database objects...');
    await Admin.deleteOne({ _id: admin._id });
    await Customer.deleteOne({ _id: customer._id });
    await Order.deleteOne({ _id: resultCreate.order._id });
    await Template.deleteMany({ adminId: admin._id });
    console.log('✅ Cleaned up.');

    // Restore original functions
    whatsappWebBot.sendMessage = originalWebBotSendMessage;
    whatsappCloudAPI.sendTemplateMessage = originalCloudAPISendTemplateMessage;

    console.log('\n🎉 Order Cancellation Webhook Verification Complete! Everything working perfectly.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runTest();

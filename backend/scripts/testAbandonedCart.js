const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Template = require('../models/Template');
const Admin = require('../models/Admin');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const AbandonedCart = require('../models/AbandonedCart');
const webhookService = require('../services/webhookService');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');
const whatsappWebBot = require('../services/whatsappWebBot');

async function runTest() {
  console.log('🧪 Starting Abandoned Cart Recovery Integration Test...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock Admin
    const testEmail = 'abandoned-cart-test@store.com';
    let admin = await Admin.findOne({ email: testEmail });
    if (admin) {
      await Admin.deleteOne({ email: testEmail });
    }
    
    admin = new Admin({
      name: 'Abandoned Cart Test Admin',
      email: testEmail,
      password: 'hashedpassword123',
      phone: '1234567890',
      businessName: 'Abandoned Cart Test Store',
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

    // Clean up old abandoned carts for this test admin
    await AbandonedCart.deleteMany({ admin: admin._id });

    // --- Scenario 1: Shopify Checkout Created/Updated (Abandoned) ---
    console.log('\n--- Scenario 1: Shopify Checkout Webhook Received (Abandoned) ---');
    
    const checkoutToken = 'checkout_token_xyz_123';
    const testPhone = '15555555555';
    
    const checkoutPayload = {
      id: 88888,
      token: checkoutToken,
      cart_token: 'cart_token_abc_123',
      email: 'cart-customer@example.com',
      total_price: '149.99',
      abandon_checkout_url: 'https://test-store.myshopify.com/checkouts/ac/checkout_token_xyz_123/recover',
      line_items: [
        {
          product_id: 11111,
          title: 'Premium Widget',
          quantity: 2,
          price: '74.995'
        }
      ],
      customer: {
        first_name: 'Cart',
        last_name: 'Customer',
        phone: testPhone
      }
    };

    console.log(`Sending checkout payload for token: ${checkoutToken}`);
    const cart = await webhookService.processCheckout('shopify', checkoutPayload, admin._id);
    
    if (!cart) {
      throw new Error('❌ Failed to process checkout, no cart returned');
    }
    
    console.log('✅ Checkout parsed and saved:');
    console.log(`   - Cart ID: ${cart.cartId}`);
    console.log(`   - Status: ${cart.status} (Expected: abandoned)`);
    console.log(`   - Amount: ${cart.totalAmount} (Expected: 149.99)`);
    console.log(`   - Customer Phone: ${cart.customerPhone} (Expected: 15555555555)`);

    // Verify database entry
    const dbCart = await AbandonedCart.findOne({ admin: admin._id, cartId: checkoutToken });
    if (!dbCart || dbCart.status !== 'abandoned') {
      throw new Error(`❌ Database check failed: status is ${dbCart?.status || 'missing'}`);
    }
    console.log('✅ Database verification: AbandonedCart record exists with status "abandoned"');

    // --- Scenario 2: Recovery Reminder Dispatch ---
    console.log('\n--- Scenario 2: Send Recovery Reminder ---');
    
    const reminderResult = await webhookService.sendCartRecoveryMessage(dbCart);
    if (!reminderResult.success) {
      throw new Error(`❌ Failed to send recovery reminder: ${reminderResult.error}`);
    }
    
    console.log('✅ Recovery reminder dispatched.');
    console.log(`   - Web Bot calls: ${webBotCallCount}`);
    console.log(`   - Message sent: "${webBotSentMessages[0]?.message}"`);
    
    if (webBotSentMessages[0]?.message.includes(checkoutPayload.abandon_checkout_url)) {
      console.log('✅ Verification: Recovery message correctly contains checkout recovery URL');
    } else {
      throw new Error('❌ Verification failed: Recovery message does not contain checkout recovery URL');
    }

    // --- Scenario 3: Order Conversion ---
    console.log('\n--- Scenario 3: Customer completes purchase (Shopify Order Created Webhook) ---');
    
    const orderPayload = {
      id: 99999,
      order_number: 109999,
      checkout_id: 88888,
      checkout_token: checkoutToken,
      customer: {
        first_name: 'Cart',
        last_name: 'Customer',
        phone: testPhone,
        email: 'cart-customer@example.com'
      },
      total_price: '149.99',
      line_items: [
        {
          product_id: 11111,
          name: 'Premium Widget',
          quantity: 2,
          price: '74.995'
        }
      ],
      financial_status: 'paid',
      fulfillment_status: null,
      created_at: new Date().toISOString()
    };

    console.log('Sending Shopify order creation webhook...');
    const orderResult = await webhookService.processWebhook('shopify', orderPayload, admin._id);
    
    // Verify AbandonedCart is marked as recovered
    const updatedCart = await AbandonedCart.findOne({ admin: admin._id, cartId: checkoutToken });
    if (!updatedCart || updatedCart.status !== 'recovered') {
      throw new Error(`❌ Verification failed: AbandonedCart status is ${updatedCart?.status || 'missing'} (expected: recovered)`);
    }
    
    console.log('✅ Verification: AbandonedCart record status is now "recovered"');
    console.log(`   - Recovered At: ${updatedCart.recoveredAt}`);

    // Clean up test data
    console.log('\n--- Cleaning up test data ---');
    await Admin.deleteOne({ _id: admin._id });
    await Customer.deleteMany({ admin: admin._id });
    await Order.deleteMany({ admin: admin._id });
    await AbandonedCart.deleteMany({ admin: admin._id });
    console.log('🧹 Cleaned up test admin, customer, order and cart records');

    // Restore original functions
    whatsappWebBot.sendMessage = originalWebBotSendMessage;
    whatsappCloudAPI.sendTemplateMessage = originalCloudAPISendTemplateMessage;

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

runTest();

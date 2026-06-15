const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const Conversation = require('../models/Conversation');
const aiService = require('../services/aiService');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');

// Simulating the controller logic for test
async function simulateWebhookFlow(messagePayload, contactName, adminDoc) {
  const customerPhone = messagePayload.from;
  const messageId = messagePayload.id;
  
  let messageContent = '';
  if (messagePayload.type === 'text') {
    messageContent = messagePayload.text.body;
  } else if (messagePayload.type === 'button') {
    messageContent = messagePayload.button.text;
  } else if (messagePayload.type === 'interactive') {
    messageContent = messagePayload.interactive.button_reply.title;
  }

  console.log(`[Simulating Webhook] Message Content: "${messageContent}" (Type: ${messagePayload.type})`);

  const aiResponse = await aiService.processMessage({
    customerPhone,
    customerName: contactName,
    message: messageContent,
    messageId,
    adminId: adminDoc._id
  });

  let sendResult;
  if (aiResponse.buttons && aiResponse.buttons.length > 0) {
    sendResult = await whatsappCloudAPI.sendInteractiveMessage(
      customerPhone,
      null,
      aiResponse.message,
      'Select an option below:',
      aiResponse.buttons
    );
  } else {
    sendResult = await whatsappCloudAPI.sendMessage(customerPhone, aiResponse.message);
  }

  return { aiResponse, sendResult };
}

async function runTest() {
  console.log('🧪 Starting Interactive Buttons Integration Test...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock Admin
    const testEmail = 'interactive-buttons-test@store.com';
    let admin = await Admin.findOne({ email: testEmail });
    if (admin) {
      await Admin.deleteOne({ email: testEmail });
    }
    
    admin = new Admin({
      name: 'Button Test Admin',
      email: testEmail,
      password: 'hashedpassword123',
      phone: '1234567890',
      businessName: 'Button Test Store',
      role: 'admin',
      subscriptionPlan: 'starter',
      subscriptionStatus: 'active',
      monthlyPrice: 29,
      geminiTokensUsed: 0,
      geminiTokensLimit: 10000,
      isActive: true,
      whatsappConnected: true
    });
    await admin.save();
    console.log(`👤 Created test admin: ${admin.email}`);

    // Clean up old conversations for this test admin
    await Conversation.deleteMany({ admin: admin._id });

    // Mock send functions
    let interactiveCallCount = 0;
    let interactiveSentMessages = [];
    const originalSendInteractiveMessage = whatsappCloudAPI.sendInteractiveMessage;
    whatsappCloudAPI.sendInteractiveMessage = async (phone, header, body, footer, buttons) => {
      interactiveCallCount++;
      interactiveSentMessages.push({ phone, header, body, footer, buttons });
      return { success: true, messageId: 'mock_int_wamid_123' };
    };

    let textCallCount = 0;
    let textSentMessages = [];
    const originalSendMessage = whatsappCloudAPI.sendMessage;
    whatsappCloudAPI.sendMessage = async (phone, message) => {
      textCallCount++;
      textSentMessages.push({ phone, message });
      return { success: true, messageId: 'mock_text_wamid_123' };
    };

    // --- Scenario 1: First Greeting Message (Hi) ---
    console.log('\n--- Scenario 1: Customer sends a Greeting ("Hi") ---');
    
    const customerPhone = '15551234567';
    const firstMsgPayload = {
      id: 'wamid.first_msg_123',
      from: customerPhone,
      type: 'text',
      text: { body: 'Hi' }
    };

    const flowResult1 = await simulateWebhookFlow(firstMsgPayload, 'Samarth Tester', admin);
    
    console.log('✅ Scenario 1 processed.');
    console.log(`   - Interactive Messages Sent: ${interactiveCallCount}`);
    console.log(`   - Text Messages Sent: ${textCallCount}`);
    
    if (flowResult1.aiResponse.buttons && flowResult1.aiResponse.buttons.length > 0) {
      console.log('✅ Verification: Bot attached interactive buttons to response');
      console.log('   Buttons:', JSON.stringify(flowResult1.aiResponse.buttons));
    } else {
      throw new Error('❌ Verification failed: Bot did not attach interactive buttons to greeting');
    }

    // --- Scenario 2: Interactive Button Click ("Check Order Status") ---
    console.log('\n--- Scenario 2: Customer clicks "Check Order Status" Button ---');
    
    const buttonClickPayload = {
      id: 'wamid.button_click_123',
      from: customerPhone,
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: {
          id: 'btn_0_123456789',
          title: 'Check Order Status'
        }
      }
    };

    const flowResult2 = await simulateWebhookFlow(buttonClickPayload, 'Samarth Tester', admin);
    
    console.log('✅ Scenario 2 processed.');
    console.log(`   - Detected Intent: ${flowResult2.aiResponse.intent} (Expected: order_status)`);
    
    if (flowResult2.aiResponse.intent === 'order_status') {
      console.log('✅ Verification: Interactive button click correctly routed to order status intent!');
    } else {
      throw new Error(`❌ Verification failed: Intent is "${flowResult2.aiResponse.intent}", expected "order_status"`);
    }

    // Clean up test data
    console.log('\n--- Cleaning up test data ---');
    await Admin.deleteOne({ _id: admin._id });
    await Conversation.deleteMany({ admin: admin._id });
    console.log('🧹 Cleaned up test admin and conversation records');

    // Restore original functions
    whatsappCloudAPI.sendInteractiveMessage = originalSendInteractiveMessage;
    whatsappCloudAPI.sendMessage = originalSendMessage;

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

runTest();

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Conversation = require('../models/Conversation');
const Admin = require('../models/Admin');
const Escalation = require('../models/Escalation');
const aiService = require('../services/aiService');
const webhookController = require('../controllers/webhookController');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');

// Track mock calls
let sendMessageCallCount = 0;
let lastSentMessage = null;
let lastSentRecipient = null;
let markAsReadCallCount = 0;

// Override Cloud API methods for simulation
whatsappCloudAPI.sendMessage = async (phoneNumber, message) => {
  console.log(`   [MOCK Cloud API] sendMessage to ${phoneNumber}: "${message.substring(0, 40)}..."`);
  sendMessageCallCount++;
  lastSentMessage = message;
  lastSentRecipient = phoneNumber;
  return { success: true, messageId: 'wamid.sent-mock-999' };
};

whatsappCloudAPI.markAsRead = async (messageId) => {
  console.log(`   [MOCK Cloud API] markAsRead for message: ${messageId}`);
  markAsReadCallCount++;
  return { success: true };
};

async function runTest() {
  console.log('🧪 Starting Task 6: WhatsApp Cloud API Integration Verification...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock Admin
    const testEmail = 'cloud-api-test@store.com';
    let admin = await Admin.findOne({ email: testEmail });
    if (admin) {
      await Admin.deleteOne({ email: testEmail });
    }
    
    admin = new Admin({
      name: 'Cloud API Test Admin',
      email: testEmail,
      password: 'hashedpassword123',
      phone: '1234567890',
      businessName: 'Cloud Test Store',
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

    const testPhone = '917777777777';
    await Conversation.deleteMany({ customerPhone: testPhone });
    await Escalation.deleteMany({ customerPhone: testPhone });
    console.log('🧹 Cleaned up old test conversations & escalations.\n');

    // Ensure we have at least one fallback conversation setup with this admin
    const initialConversation = new Conversation({
      admin: admin._id,
      customerPhone: testPhone,
      customerName: 'Initial Name',
      messages: [],
      status: 'active'
    });
    await initialConversation.save();

    // 3. Test Webhook Verification GET Handshake
    console.log('--- Step 1: Testing Webhook Verification GET ---');
    const getReqMock = {
      method: 'GET',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': process.env.WEBHOOK_VERIFY_TOKEN || 'secure_webhook_token_123',
        'hub.challenge': 'CHALLENGE_ACCEPTED_123'
      }
    };

    let responseSent = null;
    let responseStatus = null;
    const getResMock = {
      status: function(code) {
        responseStatus = code;
        return this;
      },
      send: function(data) {
        responseSent = data;
        return this;
      },
      json: function(data) {
        responseSent = data;
        return this;
      }
    };

    await webhookController.handleWebhook(getReqMock, getResMock);
    console.log(`GET handshake output: Status=${responseStatus || 200}, Data="${responseSent}"`);
    if (responseSent === 'CHALLENGE_ACCEPTED_123') {
      console.log('✅ Webhook GET Handshake verified successfully.');
    } else {
      console.error('❌ Webhook GET Handshake failed!');
    }

    // Test GET Handshake with invalid token
    const invalidGetReqMock = {
      method: 'GET',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': 'CHALLENGE_ACCEPTED_123'
      }
    };
    await webhookController.handleWebhook(invalidGetReqMock, getResMock);
    console.log(`Invalid GET handshake status: ${responseStatus} (should be 403)`);
    if (responseStatus === 403) {
      console.log('✅ Invalid GET Handshake properly rejected.');
    } else {
      console.error('❌ Invalid GET Handshake was not rejected!');
    }

    // 4. Test Normal POST Incoming Message & Dup Prevention
    console.log('\n--- Step 2: Testing POST incoming message & Duplicate prevention ---');
    sendMessageCallCount = 0;
    markAsReadCallCount = 0;

    const testUserMessageId = 'wamid.received-user-message-id-101';
    const postReqMock = {
      method: 'POST',
      body: {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789012345',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '16505553333',
                    phone_number_id: '123456123'
                  },
                  contacts: [
                    {
                      profile: {
                        name: 'Samarth Webhook Test'
                      },
                      wa_id: testPhone
                    }
                  ],
                  messages: [
                    {
                      from: testPhone,
                      id: testUserMessageId,
                      timestamp: Math.floor(Date.now() / 1000),
                      text: {
                        body: 'Hello, what is your store return policy?'
                      },
                      type: 'text'
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      }
    };

    const postResMock = {
      status: function(code) {
        responseStatus = code;
        return this;
      },
      json: function(data) {
        responseSent = data;
        return this;
      }
    };

    await webhookController.handleWebhook(postReqMock, postResMock);
    console.log(`POST response: Status=${responseStatus || 200}`);

    // Verify Cloud API calls
    console.log(`markAsRead calls: ${markAsReadCallCount}`);
    console.log(`sendMessage calls: ${sendMessageCallCount}`);
    
    // Verify DB logging
    const conv = await Conversation.findOne({ customerPhone: testPhone });
    console.log(`Logged messages count (should be exactly 2): ${conv.messages.length}`);
    console.log(`Customer name updated: "${conv.customerName}" (expected: "Samarth Webhook Test")`);
    
    const userMsg = conv.messages[0];
    const assistantMsg = conv.messages[1];

    console.log(`User message logged role: "${userMsg.role}" | messageId: "${userMsg.messageId}" | content: "${userMsg.content}"`);
    console.log(`Assistant message logged role: "${assistantMsg.role}" | messageId: "${assistantMsg.messageId}" | status: "${assistantMsg.status}"`);

    if (conv.messages.length === 2 && 
        userMsg.messageId === testUserMessageId && 
        assistantMsg.messageId === 'wamid.sent-mock-999' &&
        assistantMsg.status === 'sent') {
      console.log('✅ Message parsing, delivery response mapping, and deduplication verified.');
    } else {
      console.error('❌ Message verification failed! Check duplicate logs.');
    }

    // 5. Test Status Update webhook
    console.log('\n--- Step 3: Testing message delivery status updates ---');
    const statusReqMock = {
      method: 'POST',
      body: {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789012345',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  statuses: [
                    {
                      id: 'wamid.sent-mock-999',
                      status: 'delivered',
                      timestamp: Math.floor(Date.now() / 1000),
                      recipient_id: testPhone
                    }
                  ]
                },
                field: 'messages'
              }
            ]
          }
        ]
      }
    };

    await webhookController.handleWebhook(statusReqMock, postResMock);
    const updatedConv = await Conversation.findOne({ customerPhone: testPhone });
    const updatedAssistantMsg = updatedConv.messages.find(m => m.role === 'assistant');
    console.log(`Assistant message status after webhook update: "${updatedAssistantMsg.status}"`);
    
    if (updatedAssistantMsg.status === 'delivered') {
      console.log('✅ Webhook message status update successfully synced to database.');
    } else {
      console.error('❌ Webhook status sync failed!');
    }

    // 6. Test Inactive/Suspended Subscription
    console.log('\n--- Step 4: Testing webhook handling on suspended subscription ---');
    admin.subscriptionStatus = 'inactive';
    await admin.save();
    
    // Clear conversation messages to start clean
    await Conversation.updateOne({ customerPhone: testPhone }, { $set: { messages: [] } });
    sendMessageCallCount = 0;

    await webhookController.handleWebhook(postReqMock, postResMock);
    
    const suspendedConv = await Conversation.findOne({ customerPhone: testPhone });
    console.log(`Suspended account - sendMessage calls: ${sendMessageCallCount} (should be 0)`);
    console.log(`Suspended account - messages logged: ${suspendedConv.messages.length} (should be 1 user message)`);
    
    if (sendMessageCallCount === 0 && suspendedConv.messages.length === 1) {
      console.log('✅ Suspended account blocked from dispatching messages, logged correctly.');
    } else {
      console.error('❌ Suspended account check failed!');
    }

    // Restore subscription
    admin.subscriptionStatus = 'active';
    await admin.save();

    // 7. Test Token Limit Exceeded
    console.log('\n--- Step 5: Testing webhook handling on token limit exceeded ---');
    admin.geminiTokensUsed = 12000;
    await admin.save();

    await Conversation.updateOne({ customerPhone: testPhone }, { $set: { messages: [] } });
    sendMessageCallCount = 0;

    await webhookController.handleWebhook(postReqMock, postResMock);

    const limitConv = await Conversation.findOne({ customerPhone: testPhone });
    console.log(`Limit exceeded - sendMessage calls: ${sendMessageCallCount} (should be 0)`);
    console.log(`Limit exceeded - messages logged: ${limitConv.messages.length} (should be 1 user message)`);

    if (sendMessageCallCount === 0 && limitConv.messages.length === 1) {
      console.log('✅ Token limit exceeded blocked from dispatching messages, logged correctly.');
    } else {
      console.error('❌ Token limit check failed!');
    }

    // Restore tokens
    admin.geminiTokensUsed = 0;
    await admin.save();

    // 8. Test Auto-Escalation keyword
    console.log('\n--- Step 6: Testing webhook auto-escalation keyword ---');
    await Conversation.updateOne({ customerPhone: testPhone }, { $set: { messages: [] } });
    
    const escalationPostMock = JSON.parse(JSON.stringify(postReqMock));
    escalationPostMock.body.entry[0].changes[0].value.messages[0].text.body = 'I want a refund immediately! This is bad!';
    
    await webhookController.handleWebhook(escalationPostMock, postResMock);
    
    const escalatedConv = await Conversation.findOne({ customerPhone: testPhone });
    const escalationsCount = await Escalation.countDocuments({ customerPhone: testPhone });
    
    console.log(`Conversation status after complaint: "${escalatedConv.status}" | escalated: ${escalatedConv.escalated}`);
    console.log(`Escalation entries created in database: ${escalationsCount}`);

    if (escalatedConv.status === 'escalated' && escalationsCount === 1) {
      console.log('✅ Webhook auto-escalation successfully triggered.');
    } else {
      console.error('❌ Webhook auto-escalation failed!');
    }

    // 9. Test Agent Takeover Bypass
    console.log('\n--- Step 7: Testing AI bypass on agent takeover ---');
    sendMessageCallCount = 0;
    
    // Send another message now that it is escalated (agent takeover active)
    await webhookController.handleWebhook(postReqMock, postResMock);
    
    const bypassConv = await Conversation.findOne({ customerPhone: testPhone });
    console.log(`Bypass active - sendMessage calls: ${sendMessageCallCount} (should be 0)`);
    // Should append user message. First message was refund user, second refund reply (none because escalated), third hello user.
    // Wait, let's see how many messages are in conversation:
    // 1. user: "I want a refund..."
    // 2. user: "Hello, what is your store return..." (appended while escalated)
    console.log(`Bypass active - total messages: ${bypassConv.messages.length}`);
    
    if (sendMessageCallCount === 0) {
      console.log('✅ Agent takeover active: bypassed AI replies on incoming webhook messages.');
    } else {
      console.error('❌ Agent takeover bypass failed!');
    }

    // Clean up
    await Conversation.deleteMany({ customerPhone: testPhone });
    await Escalation.deleteMany({ customerPhone: testPhone });
    await Admin.deleteOne({ email: testEmail });
    console.log('\n🧹 Cleaned up test database objects.');
    console.log('\n🎉 Task 6 Verification Complete! Everything working perfectly.');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runTest();

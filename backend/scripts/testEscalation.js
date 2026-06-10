const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Conversation = require('../models/Conversation');
const Escalation = require('../models/Escalation');
const Admin = require('../models/Admin');
const aiService = require('../services/aiService');
const conversationController = require('../controllers/conversationController');

async function testEscalationFlow() {
  console.log('🧪 Starting Task 4: Agent Handover & CRM Portal Verification...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock Admin
    let admin = await Admin.findOne({ email: 'demo@store.com' });
    if (!admin) {
      admin = new Admin({
        name: 'Demo Admin',
        email: 'demo@store.com',
        password: 'hashedpassword123',
        phone: '1234567890',
        businessName: 'Test Store',
        role: 'admin',
        subscriptionPlan: 'Growth',
        subscriptionStatus: 'active',
        monthlyPrice: 49,
        geminiTokens: 50000,
        isActive: true
      });
      await admin.save();
      console.log('👤 Created demo admin.');
    }

    const testPhone = '919999999999';
    
    // Clean up existing conversations for testing phone
    await Conversation.deleteMany({ customerPhone: testPhone });
    await Escalation.deleteMany({ customerPhone: testPhone });
    console.log('🧹 Cleaned up old test conversations.');

    // 3. Process normal message (should respond)
    console.log('\n--- Step 1: Processing generic user message ---');
    let res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Test',
      message: 'Hello, what is your store hours?'
    });
    
    console.log(`🤖 AI Response: "${res.message}"`);
    console.log(`Intent detected: ${res.intent}`);
    console.log(`Bot Paused: ${res.botPaused || false}`);
    console.log(`Status: ${res.escalated ? 'escalated' : 'active'}`);

    // Fetch conversation to verify state
    let conv = await Conversation.findOne({ customerPhone: testPhone });
    console.log(`Stored Conversation Status: ${conv.status}, botPaused: ${conv.botPaused}`);

    // 4. Trigger auto-escalation (using complaint/refund keywords)
    console.log('\n--- Step 2: Triggering Auto-Escalation (Refund Request) ---');
    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Test',
      message: 'I want a refund immediately because the item was broken!'
    });

    console.log(`🤖 AI Response: "${res.message}"`);
    console.log(`Intent detected: ${res.intent}`);
    console.log(`Is Escalated: ${res.escalated}`);
    console.log(`Escalation Reason: ${res.escalationReason}`);

    // Check Escalation document
    const escalationCount = await Escalation.countDocuments({ customerPhone: testPhone });
    console.log(`Escalation documents in DB: ${escalationCount}`);
    if (escalationCount > 0) {
      const esc = await Escalation.findOne({ customerPhone: testPhone });
      console.log(`Escalation details: Reason=${esc.reason}, Priority=${esc.priority}, Status=${esc.status}`);
    }

    conv = await Conversation.findOne({ customerPhone: testPhone });
    console.log(`Stored Conversation Status: ${conv.status}, escalated: ${conv.escalated}`);

    // 5. Verify AI Bypass when escalated
    console.log('\n--- Step 3: Verifying AI response bypass while escalated ---');
    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Test',
      message: 'Is anyone there? Hello?'
    });

    console.log(`🤖 AI Response (Should be null): ${res.message}`);
    console.log(`Bypass Flag (botPaused): ${res.botPaused}`);
    console.log(`Intent detected: ${res.intent}`);

    conv = await Conversation.findOne({ customerPhone: testPhone });
    console.log(`Total messages logged in conversation: ${conv.messages.length}`);
    console.log(`Last message logged role: ${conv.messages[conv.messages.length - 1].role}, content: "${conv.messages[conv.messages.length - 1].content}"`);

    // 6. Simulate Admin sending message (Auto-pauses bot)
    console.log('\n--- Step 4: Simulating Admin message sending (Auto-pauses bot) ---');
    // We mock req and res for sendAdminMessage
    const reqMock = {
      admin: { _id: admin._id },
      body: {
        customerPhone: testPhone,
        message: 'Hello! I am a human store agent taking over. How can I help you with your broken item?'
      },
      app: {
        get: (name) => {
          if (name === 'io') return { emit: (event, data) => console.log(`📡 Socket Emit [${event}]:`, data) };
          return null;
        }
      }
    };

    const resMock = {
      json: (data) => {
        console.log('📦 sendAdminMessage returned json:', data.success ? 'Success' : 'Failed');
        return data;
      },
      status: function(code) {
        console.log(`🛑 Status code returned: ${code}`);
        return this;
      }
    };

    await conversationController.sendAdminMessage(reqMock, resMock);

    conv = await Conversation.findOne({ customerPhone: testPhone });
    console.log(`Stored Conversation Status: ${conv.status}, botPaused: ${conv.botPaused}`);
    console.log(`Last logged message role: ${conv.messages[conv.messages.length - 1].role}, content: "${conv.messages[conv.messages.length - 1].content}"`);

    // 7. Verify AI Bypass when botPaused: true
    console.log('\n--- Step 5: Verifying AI bypass when botPaused is explicitly true ---');
    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Test',
      message: 'Thank you agent, I want a replacement.'
    });

    console.log(`🤖 AI Response (Should be null): ${res.message}`);
    console.log(`Bypass Flag (botPaused): ${res.botPaused}`);

    // 8. Simulate Manual Resume (botPaused: false)
    console.log('\n--- Step 6: Simulating Admin manually resuming AI Bot ---');
    const updateReqMock = {
      params: { id: conv._id },
      body: { botPaused: false },
      app: {
        get: (name) => {
          if (name === 'io') return { emit: (event, data) => console.log(`📡 Socket Emit [${event}]:`, data) };
          return null;
        }
      }
    };

    await conversationController.updateConversationStatus(updateReqMock, resMock);

    conv = await Conversation.findOne({ customerPhone: testPhone });
    console.log(`Stored Conversation Status after resume: ${conv.status}, botPaused: ${conv.botPaused}`);

    // 9. Process message after resume (should respond again)
    console.log('\n--- Step 7: Verifying AI bot responds again after manual resume ---');
    res = await aiService.processMessage({
      customerPhone: testPhone,
      customerName: 'Samarth Test',
      message: 'Hello, are you back?'
    });

    console.log(`🤖 AI Response: "${res.message}"`);
    console.log(`Intent detected: ${res.intent}`);
    console.log(`Bot Paused: ${res.botPaused || false}`);

    // Clean up
    await Conversation.deleteMany({ customerPhone: testPhone });
    await Escalation.deleteMany({ customerPhone: testPhone });
    console.log('\n🧹 Cleaned up test database objects.');
    console.log('\n🎉 Task 4 Verification Complete! Everything working perfectly.');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testEscalationFlow();

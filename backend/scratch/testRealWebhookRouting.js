const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Conversation = require('../models/Conversation');
const Admin = require('../models/Admin');
const aiService = require('../services/aiService');
const webhookController = require('../controllers/webhookController');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');

// Override Cloud API to just print and return success without actually hitting the network
whatsappCloudAPI.sendMessage = async (phoneNumber, message, customCredentials) => {
  console.log(`\n📲 [MOCK Cloud API send]`);
  console.log(`   To: ${phoneNumber}`);
  console.log(`   Custom Credentials:`, customCredentials ? {
    phoneNumberId: customCredentials.phoneNumberId,
    accessToken: customCredentials.accessToken ? 'PRESENT' : 'MISSING'
  } : 'NONE');
  console.log(`   Message: "${message}"\n`);
  return { success: true, messageId: 'wamid.simulated-reply-123' };
};

whatsappCloudAPI.markAsRead = async (messageId, customCredentials) => {
  console.log(`📲 [MOCK Cloud API markAsRead] for ${messageId}`);
  return { success: true };
};

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clean up any active conversation for this test phone to start fresh
    const testPhone = '918128420287';
    await Conversation.deleteMany({ customerPhone: testPhone });

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
                    phone_number_id: '1140434719159859' // Sandbox ID
                  },
                  contacts: [
                    {
                      profile: {
                        name: 'Samarth Chavda'
                      },
                      wa_id: testPhone
                    }
                  ],
                  messages: [
                    {
                      from: testPhone,
                      id: 'wamid.received-simulated-msg-99',
                      timestamp: Math.floor(Date.now() / 1000),
                      text: {
                        body: 'is there shipping free ?'
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

    let responseStatus = null;
    let responseSent = null;
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

    console.log('📬 Dispatched simulated webhook to handler...');
    await webhookController.handleWebhook(postReqMock, postResMock);
    console.log(`Webhook handler finished with Status: ${responseStatus || 200}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

run();

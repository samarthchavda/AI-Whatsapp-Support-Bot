const whatsappService = require('../services/whatsappService');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');
const aiService = require('../services/aiService');
const Conversation = require('../models/Conversation');

// Webhook for receiving WhatsApp messages (WhatsApp Cloud API)
exports.handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    // Webhook verification
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        console.log('✅ Webhook verified');
        res.status(200).send(challenge);
        return;
      } else {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    // Handle incoming messages
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry[0];
      const changes = entry.changes[0];
      const webhookValue = changes.value;

      // Extract customer name safely
      const contactName = webhookValue.contacts?.[0]?.profile?.name || 'Customer';

      // Handle messages
      if (webhookValue.messages) {
        for (const message of webhookValue.messages) {
          await handleIncomingMessage(message, contactName);
        }
      }

      // Handle status updates
      if (webhookValue.statuses) {
        for (const status of webhookValue.statuses) {
          await handleStatusUpdate(status);
        }
      }

      // Mark webhook as received
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid webhook object' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Process incoming message
async function handleIncomingMessage(message, contactName) {
  try {
    const customerPhone = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;
    let messageContent = '';

    // Extract message content based on type
    if (message.type === 'text') {
      messageContent = message.text.body;
    } else if (message.type === 'button') {
      messageContent = message.button.text;
    } else if (message.type === 'interactive') {
      messageContent = message.interactive.button_reply.title;
    } else {
      messageContent = `[${message.type.toUpperCase()}] Message received`;
    }

    console.log(`📨 Message from ${customerPhone}: ${messageContent}`);

    // Mark message as read
    await whatsappCloudAPI.markAsRead(messageId);

    // Process with AI service
    const aiResponse = await aiService.processMessage({
      customerPhone,
      customerName: contactName,
      message: messageContent,
      messageId
    });

    if (aiResponse.botPaused) {
      console.log(`🔕 Conversation for ${customerPhone} is in agent takeover. AI response skipped.`);
      return;
    }

    console.log(`🤖 AI Response: ${aiResponse.message}`);

    // Send reply
    const sendResult = await whatsappCloudAPI.sendMessage(customerPhone, aiResponse.message);
    
    if (!sendResult.success) {
      console.error('❌ Failed to send WhatsApp reply:', sendResult.error);
      console.error('💡 Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env');
    } else {
      console.log('✅ Reply sent successfully');
      
      // Update assistant message with outgoing message ID
      if (sendResult.messageId) {
        const conversation = await Conversation.findOne({ customerPhone }).sort({ updatedAt: -1 });
        if (conversation && conversation.messages.length > 0) {
          for (let i = conversation.messages.length - 1; i >= 0; i--) {
            if (conversation.messages[i].role === 'assistant') {
              conversation.messages[i].messageId = sendResult.messageId;
              conversation.messages[i].status = 'sent';
              await conversation.save();
              break;
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}

// Handle status updates
async function handleStatusUpdate(status) {
  try {
    const messageId = status.id;
    const statusType = status.status; // sent, delivered, read, failed

    console.log(`📊 Message ${messageId} - Status: ${statusType}`);

    // Update conversation message status using messageId
    await Conversation.updateOne(
      { 'messages.messageId': messageId },
      { $set: { 'messages.$.status': statusType } }
    );

    return { messageId, status: statusType };
  } catch (error) {
    console.error('Error handling status:', error);
  }
}

// Send message via WhatsApp Cloud API
exports.sendMessage = async (req, res) => {
  try {
    const { phoneNumber, message, messageType = 'text' } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        error: 'Phone number and message are required'
      });
    }

    let result;

    if (messageType === 'template') {
      result = await whatsappCloudAPI.sendTemplateMessage(phoneNumber, message);
    } else if (messageType === 'interactive') {
      result = await whatsappCloudAPI.sendInteractiveMessage(
        phoneNumber,
        message.header,
        message.body,
        message.footer,
        message.buttons
      );
    } else {
      result = await whatsappCloudAPI.sendMessage(phoneNumber, message);
    }

    if (result.success) {
      res.json({ success: true, message: 'Message sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get WhatsApp status
exports.getStatus = async (req, res) => {
  try {
    const isConfigured = whatsappCloudAPI.isConfigured;
    let phoneDetails = null;
    
    if (isConfigured) {
      phoneDetails = await whatsappCloudAPI.getPhoneNumberDetails();
    }

    res.json({
      service: 'WhatsApp Cloud API',
      status: isConfigured ? 'active' : 'disconnected',
      isConfigured,
      phoneNumber: phoneDetails?.phone_number || 'N/A',
      verified: phoneDetails?.verified_name || 'Not verified',
      displayName: phoneDetails?.display_phone_number || 'N/A'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

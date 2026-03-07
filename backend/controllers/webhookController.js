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

      // Handle messages
      if (webhookValue.messages) {
        for (const message of webhookValue.messages) {
          await handleIncomingMessage(message);
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
async function handleIncomingMessage(message) {
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
      customerName: message.profile?.name || 'Customer',
      message: messageContent
    });

    console.log(`🤖 AI Response: ${aiResponse.message}`);

    // Send reply
    const sendResult = await whatsappCloudAPI.sendMessage(customerPhone, aiResponse.message);
    
    if (!sendResult.success) {
      console.error('❌ Failed to send WhatsApp reply:', sendResult.error);
      console.error('💡 Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env');
    } else {
      console.log('✅ Reply sent successfully');
    }

    // Log conversation
    await logConversation({
      customerPhone,
      customerName: message.profile?.name || 'Customer',
      userMessage: messageContent,
      assistantMessage: aiResponse.message,
      intent: aiResponse.intent,
      escalated: aiResponse.escalated,
      escalationReason: aiResponse.escalationReason,
      messageId,
      timestamp: new Date(timestamp * 1000)
    });

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

    // Update conversation with delivery status
    await Conversation.updateOne(
      { 'messages._id': messageId },
      { 'messages.$.status': statusType }
    );

    return { messageId, status: statusType };
  } catch (error) {
    console.error('Error handling status:', error);
  }
}

// Log conversation
async function logConversation(data) {
  try {
    let conversation = await Conversation.findOne({
      customerPhone: data.customerPhone,
      status: { $in: ['active', 'escalated'] }
    });

    if (!conversation) {
      conversation = new Conversation({
        customerPhone: data.customerPhone,
        customerName: data.customerName,
        messages: [],
        status: 'active'
      });
    }

    conversation.messages.push({
      role: 'user',
      content: data.userMessage,
      intent: data.intent,
      messageId: data.messageId,
      timestamp: data.timestamp
    });

    conversation.messages.push({
      role: 'assistant',
      content: data.assistantMessage,
      intent: data.intent,
      timestamp: new Date()
    });

    if (data.escalated) {
      conversation.escalated = true;
      conversation.escalationReason = data.escalationReason;
      conversation.escalatedAt = new Date();
      conversation.status = 'escalated';
    }

    await conversation.save();
    console.log('💾 Conversation logged');
  } catch (error) {
    console.error('Error logging conversation:', error);
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
    const phoneDetails = await whatsappCloudAPI.getPhoneNumberDetails();

    res.json({
      service: 'WhatsApp Cloud API',
      status: 'active',
      phoneNumber: phoneDetails?.phone_number || 'N/A',
      verified: phoneDetails?.verified_name || 'Not verified',
      displayName: phoneDetails?.display_phone_number || 'N/A'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

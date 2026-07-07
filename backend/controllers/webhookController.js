const whatsappService = require('../services/whatsappService');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');
const aiService = require('../services/aiService');
const Conversation = require('../models/Conversation');

// Simple in-memory deduplication set for incoming message IDs
const processedMessageIds = new Set();


// Webhook for receiving WhatsApp messages (WhatsApp Cloud API)
exports.handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    // Webhook verification
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
 
      if (mode === 'subscribe') {
        let globalVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
        try {
          const GlobalSettings = require('../models/GlobalSettings');
          const verifyTokenSetting = await GlobalSettings.findOne({ key: 'whatsapp_webhook_verify_token' });
          if (verifyTokenSetting && verifyTokenSetting.value) globalVerifyToken = verifyTokenSetting.value;
        } catch (err) {
          console.error('Error fetching dynamic WhatsApp webhook verify token from DB:', err.message);
        }

        const isGlobalMatch = token === globalVerifyToken;
        const Admin = require('../models/Admin');
        const matchedMerchant = token ? await Admin.findOne({ whatsappVerifyToken: token }) : null;

        if (isGlobalMatch || matchedMerchant) {
          console.log(`✅ Webhook verified (matched: ${isGlobalMatch ? 'global' : matchedMerchant?.email})`);
          res.status(200).send(challenge);
          return;
        } else {
          console.warn(`❌ Webhook verification failed for token: ${token}`);
          res.status(403).json({ error: 'Forbidden' });
          return;
        }
      }
    }

    // Handle incoming messages
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry[0];
      const changes = entry.changes[0];
      const webhookValue = changes.value;

      // Extract customer name safely
      const contactName = webhookValue.contacts?.[0]?.profile?.name || 'Customer';

      // Extract phone number ID from metadata to identify target merchant
      const phoneMetadata = webhookValue.metadata;
      const incomingPhoneNumberId = phoneMetadata?.phone_number_id;

      // Find the corresponding admin/merchant account
      const Admin = require('../models/Admin');
      let matchedAdmin = null;
      if (incomingPhoneNumberId) {
        matchedAdmin = await Admin.findOne({ whatsappPhoneNumberId: incomingPhoneNumberId });
      }

      // Fallback: If no match, search for a default admin configuration
      if (!matchedAdmin) {
        // Fetch dynamic phone number ID from GlobalSettings
        let systemPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        try {
          const GlobalSettings = require('../models/GlobalSettings');
          const phoneIdSetting = await GlobalSettings.findOne({ key: 'whatsapp_phone_number_id' });
          if (phoneIdSetting && phoneIdSetting.value) systemPhoneId = phoneIdSetting.value;
        } catch (err) {
          console.error('Error fetching dynamic WhatsApp phone number ID from DB:', err.message);
        }

        // If the incoming ID matches the env or DB system ID, fallback to default admin
        if (incomingPhoneNumberId === systemPhoneId || incomingPhoneNumberId === process.env.WHATSAPP_PHONE_NUMBER_ID) {
          matchedAdmin = await Admin.findOne({ whatsappConnected: true, email: { $ne: 'demo@store.com' } })
            || await Admin.findOne({ whatsappConnected: true })
            || await Admin.findOne({ email: 'demo@store.com' })
            || await Admin.findOne();
        } else {
          console.warn(`⚠️ Received message for unconfigured Phone Number ID: ${incomingPhoneNumberId}`);
        }
      }

      // Handle messages
      if (webhookValue.messages) {
        for (const message of webhookValue.messages) {
          handleIncomingMessage(message, contactName, matchedAdmin).catch(err => {
            console.error('Error handling incoming message:', err);
          });
        }
      }

      // Handle status updates
      if (webhookValue.statuses) {
        for (const status of webhookValue.statuses) {
          handleStatusUpdate(status).catch(err => {
            console.error('Error handling status update:', err);
          });
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
async function handleIncomingMessage(message, contactName, matchedAdmin) {
  try {
    const customerPhone = message.from;
    const messageId = message.id;
    
    // Deduplication check
    if (processedMessageIds.has(messageId)) {
      console.log(`♻️ Duplicate message ID ${messageId} ignored.`);
      return;
    }
    processedMessageIds.add(messageId);

    // Keep the set size under control (limit to last 1000 messages)
    if (processedMessageIds.size > 1000) {
      const firstItem = processedMessageIds.values().next().value;
      processedMessageIds.delete(firstItem);
    }

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

    console.log(`📨 Message from ${customerPhone} to ID ${matchedAdmin?.whatsappPhoneNumberId || 'sandbox'}: ${messageContent}`);

    // Retrieve custom credentials if available
    let customCredentials = null;
    if (matchedAdmin && matchedAdmin.whatsappAccessToken && matchedAdmin.whatsappPhoneNumberId) {
      customCredentials = {
        accessToken: matchedAdmin.whatsappAccessToken,
        phoneNumberId: matchedAdmin.whatsappPhoneNumberId,
        businessAccountId: matchedAdmin.whatsappBusinessAccountId
      };
    }

    // Mark message as read (using custom credentials if matched)
    await whatsappCloudAPI.markAsRead(messageId, customCredentials);

    // Check if the sender is a Super Admin
    try {
      const superAdminBotService = require('../services/superAdminBotService');
      const superAdmin = await superAdminBotService.getSuperAdmin(customerPhone);
      if (superAdmin) {
        console.log(`👑 Super Admin Message detected from ${customerPhone}. Intercepting for Super Admin Bot.`);
        await superAdminBotService.handleSuperAdminQuery(customerPhone, messageContent);
        return;
      }
    } catch (saErr) {
      console.error('Error in Super Admin Bot interception:', saErr.message);
    }

    // Process with AI service
    const aiResponse = await aiService.processMessage({
      customerPhone,
      customerName: contactName,
      message: messageContent,
      messageId,
      adminId: matchedAdmin ? matchedAdmin._id : null
    });

    if (aiResponse.botPaused) {
      if (aiResponse.message) {
        console.log(`🤖 Sending system/limit message: ${aiResponse.message}`);
        await whatsappCloudAPI.sendMessage(customerPhone, aiResponse.message, customCredentials);
      }
      console.log(`🔕 Conversation for ${customerPhone} is in agent takeover/paused. AI response skipped.`);
      return;
    }

    console.log(`🤖 AI Response: ${aiResponse.message}`);

    // Send reply (using custom credentials if matched)
    let sendResult;
    if (aiResponse.buttons && aiResponse.buttons.length > 0) {
      console.log(`🔘 Sending interactive button response to ${customerPhone} with buttons: ${aiResponse.buttons.join(', ')}`);
      sendResult = await whatsappCloudAPI.sendInteractiveMessage(
        customerPhone,
        null,
        aiResponse.message,
        'Select an option below:',
        aiResponse.buttons,
        customCredentials
      );
    } else {
      sendResult = await whatsappCloudAPI.sendMessage(customerPhone, aiResponse.message, customCredentials);
    }
    
    if (!sendResult.success) {
      console.error('❌ Failed to send WhatsApp reply:', sendResult.error);
      console.error('💡 Check WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env or merchant database');
    } else {
      console.log('✅ Reply sent successfully');
      
      // Update assistant message with outgoing message ID
      if (sendResult.messageId) {
        const query = { customerPhone };
        if (matchedAdmin) {
          query.admin = matchedAdmin._id;
        }
        const conversation = await Conversation.findOne(query).sort({ updatedAt: -1 });
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

    const Admin = require('../models/Admin');
    const adminDoc = await Admin.findById(req.admin._id);
    let customCredentials = null;
    if (adminDoc && adminDoc.whatsappAccessToken && adminDoc.whatsappPhoneNumberId) {
      customCredentials = {
        accessToken: adminDoc.whatsappAccessToken,
        phoneNumberId: adminDoc.whatsappPhoneNumberId,
        businessAccountId: adminDoc.whatsappBusinessAccountId
      };
    }

    let result;

    if (messageType === 'template') {
      result = await whatsappCloudAPI.sendTemplateMessage(phoneNumber, message, 'en_US', [], customCredentials);
    } else if (messageType === 'interactive') {
      result = await whatsappCloudAPI.sendInteractiveMessage(
        phoneNumber,
        message.header,
        message.body,
        message.footer,
        message.buttons,
        customCredentials
      );
    } else {
      result = await whatsappCloudAPI.sendMessage(phoneNumber, message, customCredentials);
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
    const Admin = require('../models/Admin');
    const adminDoc = await Admin.findById(req.admin._id);
    
    // Determine configuration strictly using custom credentials (except for default demo admin)
    const hasCustomCreds = !!(adminDoc && adminDoc.whatsappAccessToken && adminDoc.whatsappPhoneNumberId);
    const isConfigured = hasCustomCreds || (adminDoc?.email === 'demo@store.com' && whatsappCloudAPI.isConfigured);
    const isConnected = adminDoc ? adminDoc.whatsappConnected === true : false;
    
    let phoneDetails = null;
    if (isConfigured) {
      if (hasCustomCreds) {
        phoneDetails = await whatsappCloudAPI.getPhoneNumberDetails({
          accessToken: adminDoc.whatsappAccessToken,
          phoneNumberId: adminDoc.whatsappPhoneNumberId
        });
      } else {
        phoneDetails = await whatsappCloudAPI.getPhoneNumberDetails();
      }
    }

    // Load webBotEnabled setting for the specific admin account
    const webBotEnabled = adminDoc ? adminDoc.webBotEnabled === true : false;

    // Generate secure unique webhook verification token if not set
    if (adminDoc && !adminDoc.whatsappVerifyToken) {
      const crypto = require('crypto');
      adminDoc.whatsappVerifyToken = 'wh_vt_' + crypto.randomBytes(16).toString('hex');
      await adminDoc.save();
    }

    // Try to auto-detect ngrok URL for local development
    try {
      const ngrokService = require('../services/ngrokService');
      const ngrokUrl = await ngrokService.getNgrokUrl();
      if (ngrokUrl) {
        process.env.BACKEND_URL = ngrokUrl;
      }
    } catch (err) {
      console.log('Error detecting ngrok URL:', err.message);
    }
 
    res.json({
      service: 'WhatsApp Cloud API',
      status: (isConfigured && isConnected) ? 'active' : 'disconnected',
      isConfigured,
      phoneNumber: phoneDetails?.phone_number || adminDoc?.whatsappPhoneNumberId || 'N/A',
      verified: phoneDetails?.verified_name || 'Not verified',
      displayName: phoneDetails?.display_phone_number || 'N/A',
      webBotEnabled,
      isConnected,
      webhookUrl: `${process.env.BACKEND_URL || (req.protocol + '://' + req.get('host'))}/api/webhook/whatsapp`,
      verifyToken: adminDoc?.whatsappVerifyToken || process.env.WEBHOOK_VERIFY_TOKEN || 'secure_webhook_token_123',
      credentials: {
        whatsappPhoneNumberId: adminDoc?.whatsappPhoneNumberId || '',
        whatsappBusinessAccountId: adminDoc?.whatsappBusinessAccountId || '',
        whatsappAccessToken: adminDoc?.whatsappAccessToken ? '••••••••' : '' // Masked for security
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Disconnect WhatsApp
exports.disconnectWhatsApp = async (req, res) => {
  try {
    const Admin = require('../models/Admin');
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    admin.whatsappConnected = false;
    admin.whatsappConnectedAt = null;
    await admin.save();

    res.json({
      success: true,
      message: 'WhatsApp disconnected successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Connect WhatsApp
exports.connectWhatsApp = async (req, res) => {
  try {
    const Admin = require('../models/Admin');
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    admin.whatsappConnected = true;
    admin.whatsappConnectedAt = new Date();
    await admin.save();

    res.json({
      success: true,
      message: 'WhatsApp connected successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Save WhatsApp Custom Credentials
exports.saveCredentials = async (req, res) => {
  try {
    const { whatsappAccessToken, whatsappPhoneNumberId, whatsappBusinessAccountId } = req.body;
    
    const Admin = require('../models/Admin');
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    admin.whatsappAccessToken = whatsappAccessToken || null;
    admin.whatsappPhoneNumberId = whatsappPhoneNumberId || null;
    admin.whatsappBusinessAccountId = whatsappBusinessAccountId || null;
    
    // Automatically enable connection if valid credentials are saved
    if (whatsappAccessToken && whatsappPhoneNumberId && whatsappBusinessAccountId) {
      admin.whatsappConnected = true;
      admin.whatsappConnectedAt = new Date();
    } else {
      admin.whatsappConnected = false;
      admin.whatsappConnectedAt = null;
    }

    await admin.save();

    res.json({
      success: true,
      message: 'WhatsApp credentials saved successfully',
      data: {
        whatsappConnected: admin.whatsappConnected,
        whatsappPhoneNumberId: admin.whatsappPhoneNumberId,
        whatsappBusinessAccountId: admin.whatsappBusinessAccountId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

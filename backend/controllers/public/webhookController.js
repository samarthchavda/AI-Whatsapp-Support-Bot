const whatsappService = require('../../services/whatsappService');
const whatsappCloudAPI = require('../../services/whatsappCloudAPI');
const aiService = require('../../services/aiService');
const Conversation = require('../../models/Conversation');

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
          const GlobalSettings = require('../../models/GlobalSettings');
          const verifyTokenSetting = await GlobalSettings.findOne({ key: 'whatsapp_webhook_verify_token' });
          if (verifyTokenSetting && verifyTokenSetting.value) globalVerifyToken = verifyTokenSetting.value;
        } catch (err) {
          console.error('Error fetching dynamic WhatsApp webhook verify token from DB:', err.message);
        }

        const isGlobalMatch = token === globalVerifyToken;
        const Admin = require('../../models/Admin');
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

      // Extract phone number ID from metadata to identify target merchant/admin connection
      const phoneMetadata = webhookValue.metadata;
      const incomingPhoneNumberId = phoneMetadata?.phone_number_id;

      if (!incomingPhoneNumberId) {
        console.warn('🔒 [SECURITY] Webhook payload missing phone_number_id metadata. Fail-closed: skipping AI processing.');
        res.status(200).json({ success: true, message: 'Missing phone_number_id metadata' });
        return;
      }

      // Find the corresponding admin account strictly by receiving phone number ID across all accounts
      const Admin = require('../../models/Admin');
      const { encrypt } = require('../../services/whatsappCredentialService');
      const encryptedPhoneId = encrypt(incomingPhoneNumberId, true);
      const matchedAdmin = await Admin.findOne({
        $or: [
          { whatsappPhoneNumberId: encryptedPhoneId },
          { whatsappPhoneNumberId: incomingPhoneNumberId },
          { 'whatsappConnections.phoneNumberId': incomingPhoneNumberId }
        ]
      });

      // Fail-closed enforcement: if receiving connection is not registered, stop processing immediately
      if (!matchedAdmin) {
        console.warn(`🔒 [SECURITY] Unrecognized receiving phone_number_id (${incomingPhoneNumberId}). Fail-closed: skipping AI processing.`);
        res.status(200).json({ success: true, message: 'Unrecognized recipient connection' });
        return;
      }

      // Build explicit, immutable request context for this incoming message
      const isSuperAdminConnection = matchedAdmin.role === 'super_admin';
      const requestContext = {
        contextType: isSuperAdminConnection ? 'super_admin' : 'merchant',
        receivingPhoneNumberId: incomingPhoneNumberId,
        adminId: matchedAdmin._id,
        role: matchedAdmin.role,
        credentials: {
          accessToken: matchedAdmin.whatsappAccessToken,
          phoneNumberId: matchedAdmin.whatsappPhoneNumberId || incomingPhoneNumberId,
          businessAccountId: matchedAdmin.whatsappBusinessAccountId
        }
      };

      // Handle messages
      if (webhookValue.messages) {
        for (const message of webhookValue.messages) {
          handleIncomingMessage(message, contactName, matchedAdmin, requestContext).catch(err => {
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
async function handleIncomingMessage(message, contactName, matchedAdmin, requestContext) {
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
      if (message.interactive.button_reply) {
        messageContent = message.interactive.button_reply.title;
      } else if (message.interactive.list_reply) {
        messageContent = message.interactive.list_reply.title;
      } else {
        messageContent = '[INTERACTIVE] Choice selected';
      }
    } else {
      messageContent = `[${message.type.toUpperCase()}] Message received`;
    }

    console.log(`📨 Message on Connection (${requestContext.contextType.toUpperCase()}:${requestContext.receivingPhoneNumberId}) from ${customerPhone}: ${messageContent}`);

    const customCredentials = requestContext.credentials && requestContext.credentials.accessToken && requestContext.credentials.phoneNumberId
      ? requestContext.credentials
      : null;

    // Mark message as read using connection credentials
    await whatsappCloudAPI.markAsRead(messageId, customCredentials);

    // FLOW B: SUPER ADMIN CONNECTION FLOW
    if (requestContext.contextType === 'super_admin') {
      console.log(`👑 [SUPER ADMIN FLOW] Message received on Super Admin Connection (${requestContext.receivingPhoneNumberId}) from ${customerPhone}`);
      const superAdminBotService = require('../../services/superAdminBotService');
      const isAuthorized = superAdminBotService.isAuthorizedSender(customerPhone);
      
      if (isAuthorized) {
        console.log(`✅ Sender ${customerPhone} is AUTHORIZED Super Admin (+91 8128420287)`);
        await superAdminBotService.handleSuperAdminQuery(requestContext, customerPhone, messageContent);
      } else {
        console.warn(`⛔ Sender ${customerPhone} is NOT authorized to access Super Admin AI Assistant.`);
        await whatsappCloudAPI.sendMessage(
          customerPhone,
          "Hello! For support or inquiries regarding Kwickbot AI, please visit https://kwickbot.in",
          customCredentials
        );
      }
      return;
    }

    // FLOW A: MERCHANT / ADMIN CONNECTION FLOW ONLY
    console.log(`🏪 [MERCHANT FLOW] Message received on Merchant Connection (${requestContext.receivingPhoneNumberId}) for Admin ${matchedAdmin._id} from ${customerPhone}`);

    // Determine if it is a platform system number message (to bypass merchant disconnected status check)
    let isSystemNumber = false;
    try {
      let systemPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const GlobalSettings = require('../../models/GlobalSettings');
      const phoneIdSetting = await GlobalSettings.findOne({ key: 'whatsapp_phone_number_id' });
      if (phoneIdSetting && phoneIdSetting.value) systemPhoneId = phoneIdSetting.value;
      isSystemNumber = !!(requestContext.receivingPhoneNumberId && requestContext.receivingPhoneNumberId === systemPhoneId);
    } catch (err) {
      console.error('Error detecting system number flag:', err.message);
    }

    // Process with Merchant AI service (strictly Merchant context)
    const aiResponse = await aiService.processMessage({
      customerPhone,
      customerName: contactName,
      message: messageContent,
      messageId,
      adminId: matchedAdmin._id,
      isSystemNumber,
      requestContext
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
    if (aiResponse.listMessage) {
      console.log(`📋 Sending interactive list message response to ${customerPhone}`);
      sendResult = await whatsappCloudAPI.sendInteractiveListMessage(
        customerPhone,
        aiResponse.listMessage.header,
        aiResponse.message || aiResponse.listMessage.body,
        aiResponse.listMessage.footer || 'Select an option below:',
        aiResponse.listMessage.buttonLabel || 'View Options',
        aiResponse.listMessage.sections,
        customCredentials
      );
    } else if (aiResponse.buttons && aiResponse.buttons.length > 0) {
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

    const Admin = require('../../models/Admin');
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
    const Admin = require('../../models/Admin');
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
      const ngrokService = require('../../services/ngrokService');
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
    const Admin = require('../../models/Admin');
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    admin.whatsappConnected = false;
    admin.whatsappConnectedAt = null;
    admin.whatsappAccessToken = null;
    admin.whatsappPhoneNumberId = null;
    admin.whatsappBusinessAccountId = null;
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
    const Admin = require('../../models/Admin');
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    admin.whatsappConnected = true;
    admin.whatsappConnectedAt = new Date();
    await admin.save();

    // Auto-subscribe Kwickbot app to this merchant's WABA webhook events
    if (admin.whatsappBusinessAccountId && admin.whatsappAccessToken) {
      try {
        const axios = require('axios');
        const subRes = await axios.post(
          `https://graph.facebook.com/v18.0/${admin.whatsappBusinessAccountId}/subscribed_apps`,
          {},
          { params: { access_token: admin.whatsappAccessToken } }
        );
        if (subRes.data?.success) {
          console.log(`✅ [Webhook] Auto-subscribed Kwickbot app to WABA for ${admin.email}`);
        }
      } catch (subErr) {
        console.warn(`⚠️ [Webhook] WABA auto-subscribe failed: ${subErr.response?.data?.error?.message || subErr.message}`);
      }
    }

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
    
    const Admin = require('../../models/Admin');
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

    // Auto-subscribe the Kwickbot app to this merchant's WABA webhook events
    // This ensures Meta sends incoming message events to our server (not just the test app)
    if (admin.whatsappConnected && whatsappBusinessAccountId && whatsappAccessToken) {
      try {
        const axios = require('axios');
        const subscribeRes = await axios.post(
          `https://graph.facebook.com/v18.0/${whatsappBusinessAccountId}/subscribed_apps`,
          {},
          { params: { access_token: whatsappAccessToken } }
        );
        if (subscribeRes.data?.success) {
          console.log(`✅ [Webhook] Auto-subscribed app to WABA ${whatsappBusinessAccountId} for admin ${admin.email}`);
        }
      } catch (subErr) {
        // Non-fatal: log but don't fail the save
        console.warn(`⚠️ [Webhook] Could not auto-subscribe app to WABA: ${subErr.response?.data?.error?.message || subErr.message}`);
      }
    }

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

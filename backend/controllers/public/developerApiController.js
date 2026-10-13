const whatsappCloudAPI = require('../../services/whatsappCloudAPI');
const webhookRelayService = require('../../services/webhookRelayService');
const Conversation = require('../../models/Conversation');
const Admin = require('../../models/Admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for media upload endpoint
const upload = multer({
  dest: path.join(__dirname, '../../uploads/temp_media/'),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

/**
 * Normalizes phone number into E.164 digits format (without + or special characters)
 */
function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * 1. Get WhatsApp Account Details
 * GET /api/v1/whatsapp/account
 */
exports.getAccountInfo = async (req, res) => {
  try {
    const creds = req.whatsappCredentials;
    if (!creds || !creds.accessToken || !creds.phoneNumberId) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp Business account is not connected. Connect your phone number in WhatsApp Connect settings.'
      });
    }

    const details = await whatsappCloudAPI.getPhoneNumberDetails(creds);

    return res.json({
      success: true,
      account: {
        phoneNumberId: creds.phoneNumberId,
        businessAccountId: creds.businessAccountId,
        displayPhoneNumber: details?.display_phone_number || creds.displayPhoneNumber || 'Connected',
        verifiedName: details?.verified_name || creds.businessName || 'Kwickbot Business',
        qualityRating: details?.quality_rating || 'GREEN',
        codeVerificationStatus: details?.code_verification_status || 'VERIFIED',
        platformType: details?.platform_type || 'CLOUD_API',
        status: 'CONNECTED'
      }
    });
  } catch (error) {
    console.error('Error in getAccountInfo:', error);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Failed to fetch WhatsApp account info'
    });
  }
};

/**
 * 2. Get Approved WhatsApp Templates
 * GET /api/v1/whatsapp/templates
 */
exports.getTemplates = async (req, res) => {
  try {
    const creds = req.whatsappCredentials;
    if (!creds || !creds.accessToken || !creds.businessAccountId) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp Business account is not fully configured (missing businessAccountId or accessToken).'
      });
    }

    const rawTemplates = await whatsappCloudAPI.fetchTemplates(creds);

    // Format templates for third-party developer consumption
    const formatted = (rawTemplates || []).map(tpl => {
      let bodyText = '';
      let headerFormat = 'NONE';
      let buttons = [];
      let bodyVariablesCount = 0;

      if (Array.isArray(tpl.components)) {
        for (const comp of tpl.components) {
          if (comp.type === 'BODY') {
            bodyText = comp.text || '';
            const matches = bodyText.match(/\{\{\d+\}\}/g);
            bodyVariablesCount = matches ? matches.length : 0;
          } else if (comp.type === 'HEADER') {
            headerFormat = comp.format || 'TEXT';
          } else if (comp.type === 'BUTTONS' && Array.isArray(comp.buttons)) {
            buttons = comp.buttons.map(b => ({
              type: b.type,
              text: b.text,
              url: b.url || null,
              phoneNumber: b.phone_number || null
            }));
          }
        }
      }

      return {
        id: tpl.id,
        name: tpl.name,
        status: tpl.status,
        category: tpl.category,
        language: tpl.language,
        headerFormat,
        bodyText,
        bodyVariablesCount,
        buttons,
        rawComponents: tpl.components
      };
    });

    return res.json({
      success: true,
      total: formatted.length,
      templates: formatted
    });
  } catch (error) {
    console.error('Error in getTemplates:', error);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Failed to fetch templates'
    });
  }
};

/**
 * 3. Send WhatsApp Message (Template, Direct Text, Media, Interactive)
 * POST /api/v1/messages/send
 */
exports.sendMessage = async (req, res) => {
  try {
    const creds = req.whatsappCredentials;
    if (!creds || !creds.accessToken || !creds.phoneNumberId) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp Business account is not connected.'
      });
    }

    const {
      to,
      type,
      templateName,
      template,
      language = 'en',
      variables,
      bodyVariables,
      parameters,
      headerMediaUrl,
      text,
      message,
      mediaType,
      mediaUrl,
      documentUrl,
      filename,
      buttons,
      header,
      footer
    } = req.body;

    const recipientPhone = normalizePhone(to || req.body.recipientPhone || req.body.phone);
    if (!recipientPhone) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: "to" (recipient phone number with country code, e.g. 919876543210)'
      });
    }

    // Determine message type
    const resolvedType = (type || (templateName || template ? 'template' : (mediaUrl || documentUrl ? 'media' : 'text'))).toLowerCase();

    let sendResult;

    // A. Template Message
    if (resolvedType === 'template') {
      const selectedTplName = templateName || (typeof template === 'string' ? template : template?.name);
      if (!selectedTplName) {
        return res.status(400).json({
          success: false,
          error: 'Missing "templateName" for template message'
        });
      }

      const selectedLang = language || template?.language || 'en';
      let paramsArray = [];

      // Accept variables as array or object {"1": "Val", "2": "Val"}
      const rawVars = bodyVariables || variables || parameters || template?.variables || template?.bodyVariables;
      if (Array.isArray(rawVars)) {
        paramsArray = rawVars.map(v => String(v));
      } else if (rawVars && typeof rawVars === 'object') {
        const sortedKeys = Object.keys(rawVars).sort((a, b) => Number(a) - Number(b));
        paramsArray = sortedKeys.map(k => String(rawVars[k]));
      }

      const headerImg = headerMediaUrl || template?.headerMediaUrl || null;

      sendResult = await whatsappCloudAPI.sendTemplateMessage(
        recipientPhone,
        selectedTplName,
        selectedLang,
        paramsArray,
        creds,
        headerImg
      );
    }
    // B. Direct Text Message
    else if (resolvedType === 'text') {
      const textContent = text || message;
      if (!textContent) {
        return res.status(400).json({
          success: false,
          error: 'Missing "text" message body'
        });
      }

      sendResult = await whatsappCloudAPI.sendMessage(recipientPhone, textContent, creds);
    }
    // C. Document / Media Message
    else if (resolvedType === 'media' || resolvedType === 'document' || resolvedType === 'image') {
      const docUrl = mediaUrl || documentUrl;
      if (!docUrl) {
        return res.status(400).json({
          success: false,
          error: 'Missing "mediaUrl" for media message'
        });
      }

      const docName = filename || 'document.pdf';
      sendResult = await whatsappCloudAPI.sendDocument(recipientPhone, docUrl, docName, creds);
    }
    // D. Interactive Buttons
    else if (resolvedType === 'interactive' && Array.isArray(buttons)) {
      sendResult = await whatsappCloudAPI.sendInteractiveMessage(
        recipientPhone,
        header || null,
        text || message || 'Please select an option:',
        footer || undefined,
        buttons,
        creds
      );
    } else {
      return res.status(400).json({
        success: false,
        error: `Unsupported message type: "${resolvedType}". Allowed: template, text, media, interactive`
      });
    }

    if (!sendResult || !sendResult.success) {
      return res.status(400).json({
        success: false,
        error: sendResult?.error || 'Failed to send WhatsApp message via Meta Cloud API',
        metaDetails: sendResult?.metaDetails || null
      });
    }

    // Record outbound message in Conversation history for live dashboard visibility
    try {
      let conversation = await Conversation.findOne({
        admin: req.admin._id,
        customerPhone: recipientPhone
      });

      if (!conversation) {
        conversation = new Conversation({
          admin: req.admin._id,
          customerPhone: recipientPhone,
          customerName: req.body.customerName || 'Customer',
          messages: []
        });
      }

      conversation.messages.push({
        role: 'assistant',
        content: resolvedType === 'template' ? `[Template: ${templateName || template?.name}]` : (text || message || `[Media: ${mediaUrl || documentUrl}]`),
        messageId: sendResult.messageId,
        status: 'sent',
        timestamp: new Date()
      });
      conversation.lastMessageAt = new Date();
      await conversation.save();
    } catch (dbErr) {
      console.warn('⚠️ Could not log conversation message:', dbErr.message);
    }

    return res.json({
      success: true,
      messageId: sendResult.messageId,
      status: 'sent',
      recipientPhone,
      type: resolvedType
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Internal error sending message'
    });
  }
};

/**
 * 4. Upload Media to Meta
 * POST /api/v1/media/upload
 */
exports.uploadMedia = [
  upload.single('file'),
  async (req, res) => {
    try {
      const creds = req.whatsappCredentials;
      if (!creds || !creds.accessToken || !creds.phoneNumberId) {
        return res.status(400).json({
          success: false,
          error: 'WhatsApp Business account is not connected.'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No media file provided in "file" form field.'
        });
      }

      const mediaType = req.body.mediaType || req.file.mimetype || 'image/jpeg';
      const result = await whatsappCloudAPI.uploadMedia(
        creds.phoneNumberId,
        req.file.path,
        mediaType,
        creds
      );

      // Clean up temporary local file
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // ignore unlink error
      }

      if (result && result.id) {
        return res.json({
          success: true,
          mediaId: result.id,
          message: 'Media uploaded successfully to WhatsApp Cloud API'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Meta did not return a valid media ID.'
        });
      }
    } catch (error) {
      console.error('Error uploading media:', error);
      return res.status(500).json({
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Media upload failed'
      });
    }
  }
];

/**
 * 5. Webhook Settings - Get Current Config
 * GET /api/v1/developer/webhook-config
 */
exports.getWebhookConfig = async (req, res) => {
  try {
    const admin = req.admin;
    if (!admin.developerWebhookSecret) {
      admin.developerWebhookSecret = webhookRelayService.generateSecret();
      await admin.save();
    }

    return res.json({
      success: true,
      apiKey: admin.apiKey,
      webhookUrl: admin.developerWebhookUrl || '',
      webhookSecret: admin.developerWebhookSecret,
      events: admin.developerWebhookEvents || ['messages.received', 'messages.delivered', 'messages.read', 'messages.failed'],
      isActive: admin.isDeveloperWebhookActive !== false
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch webhook config' });
  }
};

/**
 * 6. Webhook Settings - Update Config
 * POST /api/v1/developer/webhook-config
 */
exports.updateWebhookConfig = async (req, res) => {
  try {
    const admin = req.admin;
    const { webhookUrl, events, isActive } = req.body;

    if (webhookUrl !== undefined) {
      const trimmed = String(webhookUrl).trim();
      if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return res.status(400).json({
          success: false,
          error: 'Webhook URL must start with http:// or https://'
        });
      }
      admin.developerWebhookUrl = trimmed || null;
    }

    if (Array.isArray(events)) {
      admin.developerWebhookEvents = events;
    }

    if (isActive !== undefined) {
      admin.isDeveloperWebhookActive = Boolean(isActive);
    }

    if (!admin.developerWebhookSecret) {
      admin.developerWebhookSecret = webhookRelayService.generateSecret();
    }

    await admin.save();

    return res.json({
      success: true,
      message: 'Developer webhook settings saved successfully',
      webhookUrl: admin.developerWebhookUrl,
      webhookSecret: admin.developerWebhookSecret,
      events: admin.developerWebhookEvents,
      isActive: admin.isDeveloperWebhookActive
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to update webhook config' });
  }
};

/**
 * 7. Rotate Webhook Signing Secret
 * POST /api/v1/developer/rotate-secret
 */
exports.rotateWebhookSecret = async (req, res) => {
  try {
    const admin = req.admin;
    admin.developerWebhookSecret = webhookRelayService.generateSecret();
    await admin.save();

    return res.json({
      success: true,
      message: 'Webhook signing secret rotated successfully',
      webhookSecret: admin.developerWebhookSecret
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to rotate secret' });
  }
};

/**
 * 8. Send Test Ping to Developer Webhook
 * POST /api/v1/developer/test-webhook
 */
exports.testWebhook = async (req, res) => {
  try {
    const admin = req.admin;
    const testUrl = req.body.webhookUrl || admin.developerWebhookUrl;
    const testSecret = admin.developerWebhookSecret || webhookRelayService.generateSecret();

    if (!testUrl) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a Webhook URL before running the connectivity test.'
      });
    }

    const pingResult = await webhookRelayService.sendTestPing(testUrl, testSecret);

    return res.json({
      success: pingResult.success,
      statusCode: pingResult.statusCode,
      latencyMs: pingResult.latencyMs,
      response: pingResult.response,
      error: pingResult.error,
      message: pingResult.success ? 'Webhook test passed! Endpoint responded with 2xx status.' : 'Webhook test failed. Verify destination server URL.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Error executing webhook ping test'
    });
  }
};

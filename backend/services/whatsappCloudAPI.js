// WhatsApp Cloud API Integration
// This is the real production integration with WhatsApp Business API

const axios = require('axios');
const { getPoints, getConfiguredInrRates, summarize } = require('./metaCostAnalytics');

class WhatsAppCloudAPI {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'YOUR_BUSINESS_ACCOUNT_ID';
    this.webhookVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'webhook_token_123';
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.isConfigured = this.accessToken !== 'YOUR_ACCESS_TOKEN' && this.phoneNumberId !== 'YOUR_PHONE_NUMBER_ID';
  }

  // Meta now bills per delivered message. The older conversation_analytics
  // field does not describe the current pricing categories/free messages.
  async fetchConversationAnalytics(startDate, endDate, customCredentials) {
    const { accessToken, businessAccountId } = customCredentials || {};
    if (!accessToken || !/^\d+$/.test(String(businessAccountId || ''))) {
      throw new Error('Merchant WhatsApp Business credentials are missing.');
    }
    const start = Math.floor(new Date(startDate).getTime() / 1000);
    const end = Math.floor(new Date(endDate).getTime() / 1000);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      throw new Error('Invalid analytics date range.');
    }
    const fields = `currency,pricing_analytics.start(${start}).end(${end}).granularity(DAILY).metric_types(["COST","VOLUME"]).dimensions(["COUNTRY","PHONE","PRICING_CATEGORY","PRICING_TYPE"])`;
    const config = {
      params: { fields },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 12000
    };
    const response = await axios.get(`https://graph.facebook.com/v25.0/${businessAccountId}`, config);
    const firstPage = response.data;
    let next = firstPage?.pricing_analytics?.paging?.next;
    if (!next) return firstPage;
    const points = getPoints(firstPage);
    let pages = 0;
    while (next) {
      if (++pages > 20) throw new Error('Meta analytics has more pages than this request can safely load.');
      const pageUrl = new URL(next);
      if (pageUrl.protocol !== 'https:' || pageUrl.hostname !== 'graph.facebook.com' ||
          !pageUrl.pathname.split('/').includes(String(businessAccountId))) {
        throw new Error('Meta returned an invalid analytics pagination URL.');
      }
      pageUrl.searchParams.delete('access_token');
      const page = await axios.get(pageUrl.toString(), { headers: config.headers, timeout: config.timeout });
      points.push(...getPoints(page.data));
      next = page.data?.pricing_analytics?.paging?.next || page.data?.paging?.next;
    }
    return { ...firstPage, pricing_analytics: { data_points: points } };
  }

  async getEstimatedCosts(adminId, timeRange = 'this_month') {
    const Admin = require('../models/Admin');
    const Conversation = require('../models/Conversation');
    const admin = await Admin.findById(adminId).select('+whatsappAccessToken +whatsappBusinessAccountId +whatsappPhoneNumberId');
    if (!admin) throw new Error('Merchant account not found.');

    const periods = new Set(['today', 'last_7_days', 'this_month']);
    if (!periods.has(timeRange)) throw new Error('Unsupported analytics period.');
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = timeRange === 'today' ? todayStart : timeRange === 'last_7_days'
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)) : monthStart;
    const base = {
      period: timeRange, currency: null, source: 'unavailable', totalEstimatedCost: null,
      categories: {}, dailyBreakdown: [], freeTier: { used: 0, limit: 1000, phones: [] },
      localDeliveredMessages: 0, reconciliation: null, metaBillingUrl: 'https://business.facebook.com/billing_hub'
    };
    if (!admin.whatsappConnected || !admin.whatsappAccessToken || !admin.whatsappBusinessAccountId) {
      return { ...base, source: 'not_connected', warning: 'Connect your own Meta WhatsApp Business account to see messaging charges.' };
    }

    const credentials = { accessToken: admin.whatsappAccessToken, businessAccountId: admin.whatsappBusinessAccountId };
    let localDeliveredMessages = 0;
    try {
      const local = await Conversation.aggregate([
        { $match: { admin: admin._id } },
        { $unwind: '$messages' },
        { $match: { 'messages.role': 'assistant', 'messages.status': { $in: ['delivered', 'read'] }, 'messages.timestamp': { $gte: start, $lte: now } } },
        { $count: 'count' }
      ]);
      localDeliveredMessages = local[0]?.count || 0;
    } catch (_) {
      // This is only a short-retention diagnostic, never a billing fallback.
    }

    try {
      const current = await this.fetchConversationAnalytics(start, now, credentials);
      if (!Object.prototype.hasOwnProperty.call(current || {}, 'pricing_analytics')) {
        throw new Error('Meta did not return pricing_analytics.');
      }
      const points = getPoints(current);
      const metaCurrency = String(current?.pricing_analytics?.currency || current?.currency || '').toUpperCase() || null;
      const currency = metaCurrency;
      const inrRates = getConfiguredInrRates();
      const result = summarize(points, { currency, inrRates, period: timeRange, localDeliveredMessages, phoneNumberId: admin.whatsappPhoneNumberId });
      result.reconciliation = {
        metaDeliveredMessages: Object.values(result.categories).reduce((sum, item) => sum + item.count, 0),
        localDeliveredReplies: localDeliveredMessages,
        status: 'partial',
        note: 'Kwickbot retains chats for only 24 hours and does not store Meta billing category per message. Local replies are diagnostic only, not an invoice reconciliation.'
      };
      result.currencySource = metaCurrency ? 'meta' : 'unavailable';
      result.scope = 'connected_business_account';
      if (timeRange !== 'this_month') {
        try {
          const monthly = await this.fetchConversationAnalytics(monthStart, now, credentials);
          const monthSummary = summarize(getPoints(monthly), { currency, inrRates, period: 'this_month', phoneNumberId: admin.whatsappPhoneNumberId });
          result.freeTier = monthSummary.freeTier;
        } catch (_) {
          result.freeTier = null;
          result.warning = 'Monthly free-service allowance could not be loaded from Meta.';
        }
      }
      if (!points.length) {
        result.warning = 'Meta has not reported pricing activity for this period yet. Analytics may be delayed.';
      } else if (result.source === 'unavailable') {
        result.warning = 'Meta returned volume but not cost. No verified rate card is configured for this billing currency/market, so no amount is shown.';
      } else if (result.source === 'rate_card_estimate') {
        result.warning = `Estimate using configured Meta INR rate card effective ${inrRates.effectiveDate}; Meta invoice may differ due to tiers, taxes, and adjustments.`;
      }
      if (!currency) {
        result.source = 'unavailable';
        result.totalEstimatedCost = null;
        Object.values(result.categories).forEach((item) => { item.cost = null; });
        result.dailyBreakdown.forEach((item) => { item.cost = null; });
        result.warning = 'Meta did not return the WhatsApp Business Account billing currency. Verify costs in Meta Business Suite.';
      }
      return result;
    } catch (error) {
      const status = error.response?.status;
      return {
        ...base, localDeliveredMessages,
        warning: status === 401 || status === 403
          ? 'Meta denied analytics access. Check your WhatsApp token and analytics permissions.'
          : 'Meta pricing analytics is temporarily unavailable. Your Meta invoice remains the source of truth.'
      };
    }
  }

  // Initialize webhook
  initializeWebhook() {
    console.log('✅ WhatsApp Cloud API initialized');
    console.log('📱 Phone Number ID:', this.phoneNumberId);
    console.log('🔐 Webhook Verify Token:', this.webhookVerifyToken);
  }

  // Verify webhook (used by Facebook to verify the webhook)
  verifyWebhook(mode, verifyToken, challenge) {
    if (mode === 'subscribe' && verifyToken === this.webhookVerifyToken) {
      console.log('✅ Webhook verified successfully');
      return challenge;
    }
    return null;
  }

  // Get system connection settings dynamically
  async getSystemSettings() {
    let accessToken = this.accessToken;
    let phoneNumberId = this.phoneNumberId;
    let businessAccountId = this.businessAccountId;
    let webhookVerifyToken = this.webhookVerifyToken;

    try {
      const GlobalSettings = require('../models/GlobalSettings');
      const tokenSetting = await GlobalSettings.findOne({ key: 'whatsapp_access_token' });
      const phoneIdSetting = await GlobalSettings.findOne({ key: 'whatsapp_phone_number_id' });
      const bizIdSetting = await GlobalSettings.findOne({ key: 'whatsapp_business_account_id' });
      const verifyTokenSetting = await GlobalSettings.findOne({ key: 'whatsapp_webhook_verify_token' });

      if (tokenSetting && tokenSetting.value) accessToken = tokenSetting.value;
      if (phoneIdSetting && phoneIdSetting.value) phoneNumberId = phoneIdSetting.value;
      if (bizIdSetting && bizIdSetting.value) businessAccountId = bizIdSetting.value;
      if (verifyTokenSetting && verifyTokenSetting.value) webhookVerifyToken = verifyTokenSetting.value;
    } catch (err) {
      console.error('Error fetching dynamic WhatsApp credentials from DB:', err.message);
    }

    return {
      accessToken,
      phoneNumberId,
      businessAccountId,
      webhookVerifyToken
    };
  }

  // Send message via WhatsApp Cloud API
  async sendMessage(phoneNumber, message, customCredentials = null) {
    let accessToken;
    let phoneNumberId;
    let isConfig;

    if (customCredentials) {
      accessToken = customCredentials.accessToken;
      phoneNumberId = customCredentials.phoneNumberId;
      isConfig = !!(accessToken && phoneNumberId);
    } else {
      const systemSettings = await this.getSystemSettings();
      accessToken = systemSettings.accessToken;
      phoneNumberId = systemSettings.phoneNumberId;
      isConfig = (accessToken && accessToken !== 'YOUR_ACCESS_TOKEN') && (phoneNumberId && phoneNumberId !== 'YOUR_PHONE_NUMBER_ID');
    }

    // Check if API is configured
    if (!isConfig) {
      console.error('❌ WhatsApp Cloud API not configured!');
      console.error('   Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env file');
      return {
        success: false,
        error: 'WhatsApp API credentials not configured. Please update .env file.'
      };
    }

    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;
      
      let formattedPhone = phoneNumber.toString().replace(/\D/g, '');
      if (formattedPhone.length === 10 && /^[6-9]/.test(formattedPhone)) {
        formattedPhone = '91' + formattedPhone;
      }

      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      };

      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.post(url, data, config);
      
      console.log(`✅ Message sent to ${formattedPhone}`);
      console.log('Response:', response.data);
      
      return {
        success: true,
        messageId: response.data?.messages?.[0]?.id,
        timestamp: new Date()
      };

    } catch (error) {
      const metaErrDetails = error.response?.data?.error;
      const errorMsg = metaErrDetails ? `[Meta Error ${metaErrDetails.code}]: ${metaErrDetails.message}` : error.message;
      console.error('❌ Error sending WhatsApp message:', error.response?.data || error.message);

      // A merchant message must never fall back to the platform credentials. Apart
      // from replying from the wrong business number, that would cross tenant
      // boundaries if a merchant token is expired or incorrectly configured.
      if (customCredentials) {
        console.error(`🔒 Merchant WhatsApp send failed for ${phoneNumber}; system credential fallback is blocked: ${errorMsg}`);
      }

      return {
        success: false,
        error: errorMsg
      };
    }
  }

  // Handle incoming messages from webhook
  async handleIncomingMessage(message) {
    try {
      const from = message.from;
      const messageId = message.id;
      const timestamp = message.timestamp;
      let messageContent = '';
      let messageType = message.type;

      // Extract message content based on type
      if (messageType === 'text') {
        messageContent = message.text.body;
      } else if (messageType === 'button') {
        messageContent = message.button.text;
      } else if (messageType === 'interactive') {
        messageContent = message.interactive.button_reply.title;
      } else if (messageType === 'image') {
        const image = message.image;
        messageContent = `[Image] ${image.caption || 'No caption'}`;
      } else if (messageType === 'document') {
        const document = message.document;
        messageContent = `[Document] ${document.filename}`;
      }

      console.log(`📨 Message from ${from}: ${messageContent}`);
      console.log(`📱 Message Type: ${messageType}`);
      console.log(`⏰ Timestamp: ${new Date(timestamp * 1000).toLocaleString()}`);

      return {
        from,
        messageId,
        timestamp: new Date(timestamp * 1000),
        content: messageContent,
        type: messageType,
        success: true
      };

    } catch (error) {
      console.error('❌ Error handling message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Mark message as read
  async markAsRead(messageId, customCredentials = null) {
    const accessToken = customCredentials?.accessToken || this.accessToken;
    const phoneNumberId = customCredentials?.phoneNumberId || this.phoneNumberId;
    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;

      const data = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      };

      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      await axios.post(url, data, config);
      console.log(`✅ Message ${messageId} marked as read`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error marking message as read:', error);
      return { success: false };
    }
  }

  // Send template message
  async sendTemplateMessage(phoneNumber, templateName, templateLanguage = 'en', parameters = [], customCredentials = null, headerImageUrl = null) {
    let accessToken;
    let phoneNumberId;
    let isConfig;

    if (customCredentials) {
      accessToken = customCredentials.accessToken;
      phoneNumberId = customCredentials.phoneNumberId;
      isConfig = !!(accessToken && phoneNumberId);
    } else {
      const systemSettings = await this.getSystemSettings();
      accessToken = systemSettings.accessToken;
      phoneNumberId = systemSettings.phoneNumberId;
      isConfig = (accessToken && accessToken !== 'YOUR_ACCESS_TOKEN') && (phoneNumberId && phoneNumberId !== 'YOUR_PHONE_NUMBER_ID');
    }

    // If not configured, return mock success (helpful for local dev / testing)
    if (!isConfig) {
      console.log(`⚠️ WhatsApp Cloud API not configured. Simulating template message dispatch:`);
      console.log(`   To: ${phoneNumber}`);
      console.log(`   Template: ${templateName} [${templateLanguage}]`);
      console.log(`   Image Header: ${headerImageUrl || 'None'}`);
      console.log(`   Parameters:`, JSON.stringify(parameters, null, 2));
      return { 
        success: true, 
        messageId: 'mock_tpl_wamid_' + Math.random().toString(36).substr(2, 9) 
      };
    }

    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;

      let formattedPhone = phoneNumber.toString().replace(/\D/g, '');
      if (formattedPhone.length === 10 && /^[6-9]/.test(formattedPhone)) {
        formattedPhone = '91' + formattedPhone;
      }

      // Map parameters to Meta format components (body text placeholders)
      const formattedParameters = parameters.map(p => {
        if (typeof p === 'object' && p !== null && p.type) {
          return p;
        }
        return { type: 'text', text: String(p) };
      });

      const data = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: templateLanguage || 'en'
          }
        }
      };

      const components = [];

      if (headerImageUrl) {
        components.push({
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: headerImageUrl
              }
            }
          ]
        });
      }

      if (formattedParameters.length > 0) {
        components.push({
          type: 'body',
          parameters: formattedParameters
        });
      }

      if (components.length > 0) {
        data.template.components = components;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.post(url, data, config);
      console.log(`✅ Template message sent to ${formattedPhone} using template ${templateName}`);
      return { 
        success: true, 
        messageId: response.data?.messages?.[0]?.id || 'wamid.' + Math.random().toString(36).substr(2, 9) 
      };

    } catch (error) {
      const metaErrDetails = error.response?.data?.error;
      const errorMsg = metaErrDetails ? `[Meta Error ${metaErrDetails.code}]: ${metaErrDetails.message}` : error.message;
      console.error('❌ Error sending template:', error.response?.data || error.message);

      // Template messages have the same tenant boundary as normal messages.
      // Do not retry through the platform number when merchant credentials fail.
      if (customCredentials) {
        console.error(`🔒 Merchant template send failed for ${phoneNumber}; system credential fallback is blocked: ${errorMsg}`);
      }

      return { success: false, error: errorMsg };
    }
  }

  // Send interactive message with buttons
  async sendInteractiveMessage(phoneNumber, headerText, bodyText, footerText, buttons, customCredentials = null) {
    const accessToken = customCredentials?.accessToken || this.accessToken;
    const phoneNumberId = customCredentials?.phoneNumberId || this.phoneNumberId;
    const isConfig = (customCredentials?.accessToken && customCredentials?.phoneNumberId) || this.isConfigured;

    // If not configured, return mock success (helpful for local dev / testing)
    if (!isConfig) {
      console.log(`⚠️ WhatsApp Cloud API not configured. Simulating interactive message dispatch:`);
      console.log(`   To: ${phoneNumber}`);
      console.log(`   Header: ${headerText || 'None'}`);
      console.log(`   Body: ${bodyText}`);
      console.log(`   Footer: ${footerText || 'None'}`);
      console.log(`   Buttons:`, JSON.stringify(buttons, null, 2));
      return { 
        success: true, 
        messageId: 'mock_int_wamid_' + Math.random().toString(36).substr(2, 9) 
      };
    }

    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;

      const safeBodyText = (bodyText && typeof bodyText === 'string')
        ? (bodyText.length > 1024 ? bodyText.substring(0, 1020) + '...' : bodyText)
        : 'Select an option below:';

      const interactive = {
        type: 'button',
        body: {
          text: safeBodyText
        },
        action: {
          buttons: buttons.slice(0, 3).map((btn, idx) => ({
            type: 'reply',
            reply: {
              id: `btn_${idx}_${Date.now()}`,
              title: btn.substring(0, 20)
            }
          }))
        }
      };

      if (headerText) {
        interactive.header = {
          type: 'text',
          text: headerText
        };
      }

      if (footerText) {
        interactive.footer = {
          text: footerText
        };
      }

      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber.replace(/\D/g, ''),
        type: 'interactive',
        interactive
      };

      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.post(url, data, config);
      console.log(`✅ Interactive message sent to ${phoneNumber}`);
      return { success: true, messageId: response.data.messages[0].id };

    } catch (error) {
      console.error('❌ Error sending interactive message:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Send interactive list message
  async sendInteractiveListMessage(phoneNumber, headerText, bodyText, footerText, buttonLabel, sections, customCredentials = null) {
    const accessToken = customCredentials?.accessToken || this.accessToken;
    const phoneNumberId = customCredentials?.phoneNumberId || this.phoneNumberId;
    const isConfig = (customCredentials?.accessToken && customCredentials?.phoneNumberId) || this.isConfigured;

    if (!isConfig) {
      console.log(`⚠️ WhatsApp Cloud API not configured. Simulating list message dispatch:`);
      console.log(`   To: ${phoneNumber}`);
      console.log(`   Body: ${bodyText}`);
      console.log(`   Button: ${buttonLabel}`);
      console.log(`   Sections:`, JSON.stringify(sections, null, 2));
      return { 
        success: true, 
        messageId: 'mock_list_wamid_' + Math.random().toString(36).substr(2, 9) 
      };
    }

    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;

      const interactive = {
        type: 'list',
        body: {
          text: bodyText
        },
        action: {
          button: (buttonLabel || 'Select Topic').substring(0, 20),
          sections: sections.map(sec => ({
            title: (sec.title || 'Options').substring(0, 24),
            rows: (sec.rows || []).slice(0, 10).map((row, rIdx) => ({
              id: row.id || `row_${rIdx}_${Date.now()}`,
              title: row.title.substring(0, 24),
              description: row.description ? row.description.substring(0, 72) : undefined
            }))
          }))
        }
      };

      if (headerText) {
        interactive.header = {
          type: 'text',
          text: headerText.substring(0, 60)
        };
      }

      if (footerText) {
        interactive.footer = {
          text: footerText.substring(0, 60)
        };
      }

      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber.replace(/\D/g, ''),
        type: 'interactive',
        interactive
      };

      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.post(url, data, config);
      console.log(`✅ Interactive list message sent to ${phoneNumber}`);
      return { success: true, messageId: response.data.messages[0].id };

    } catch (error) {
      console.error('❌ Error sending interactive list message:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  // Get business phone number details
  async getPhoneNumberDetails(customCredentials = null) {
    const accessToken = customCredentials?.accessToken || this.accessToken;
    const phoneNumberId = customCredentials?.phoneNumberId || this.phoneNumberId;
    try {
      const url = `${this.baseUrl}/${phoneNumberId}`;
      
      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      };

      const response = await axios.get(url, config);
      console.log('📱 Phone Number Details:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Error getting phone details:', error);
      return null;
    }
  }

  // Get message media (images, documents, etc.)
  async getMedia(mediaId, customCredentials = null) {
    const accessToken = customCredentials?.accessToken || this.accessToken;
    try {
      const url = `${this.baseUrl}/${mediaId}`;
      
      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      };

      const response = await axios.get(url, config);
      return response.data;

    } catch (error) {
      console.error('❌ Error getting media:', error);
      return null;
    }
  }

  // Upload media for sending
  async uploadMedia(phoneNumberId, mediaFile, mediaType = 'image', customCredentials = null) {
    const accessToken = customCredentials?.accessToken || this.accessToken;
    try {
      const url = `${this.baseUrl}/${phoneNumberId}/media`;
      
      const formData = new FormData();
      formData.append('file', mediaFile);
      formData.append('type', mediaType); // image, audio, video, document

      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data'
        }
      };

      const response = await axios.post(url, formData, config);
      console.log(`✅ Media uploaded: ${response.data.id}`);
      return { success: true, mediaId: response.data.id };

    } catch (error) {
      console.error('❌ Error uploading media:', error);
      return { success: false, error: error.message };
    }
  }

  // Webhook handler for status updates
  handleStatusUpdate(webhook) {
    const status = webhook.value.statuses[0];
    const messageId = status.id;
    const statusType = status.status; // sent, delivered, read, failed

    console.log(`📊 Status Update - Message: ${messageId}, Status: ${statusType}`);

    return {
      messageId,
      status: statusType,
      timestamp: new Date(status.timestamp * 1000)
    };
  }

  // Fetch templates from Meta Graph API
  async fetchTemplates(customCredentials = null) {
    let accessToken;
    let businessAccountId;
    let isConfig;

    if (customCredentials) {
      accessToken = customCredentials.accessToken;
      businessAccountId = customCredentials.businessAccountId;
      isConfig = !!(accessToken && businessAccountId);
    } else {
      const systemSettings = await this.getSystemSettings();
      accessToken = systemSettings.accessToken;
      businessAccountId = systemSettings.businessAccountId;
      isConfig = (accessToken && accessToken !== 'YOUR_ACCESS_TOKEN') && (businessAccountId && businessAccountId !== 'YOUR_BUSINESS_ACCOUNT_ID');
    }

    if (!isConfig) {
      console.log('⚠️ WhatsApp Cloud API not configured. Returning empty template list.');
      return [];
    }

    try {
      const url = `${this.baseUrl}/${businessAccountId}/message_templates`;
      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      };

      const response = await axios.get(url, config);
      console.log('✅ Templates fetched from Meta:', response.data.data?.length || 0);
      return response.data.data || [];
    } catch (error) {
      console.error('❌ Error fetching templates from Meta:', error.response?.data || error.message);
      return [];
    }
  }

  // Submit a message template for Meta review. Template creation is deliberately
  // scoped to the merchant's own WABA credentials; there is no platform-token
  // fallback because that could create a template in another business account.
  async createTemplate(templateData, customCredentials = null) {
    const accessToken = customCredentials?.accessToken;
    const businessAccountId = customCredentials?.businessAccountId;

    if (!accessToken || !businessAccountId) {
      const error = new Error('Connect your WhatsApp Business account before creating a template.');
      error.statusCode = 400;
      throw error;
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v20.0/${businessAccountId}/message_templates`,
        templateData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      const metaError = error.response?.data?.error;
      const safeError = new Error(metaError?.message || 'Meta could not create this template.');
      safeError.statusCode = error.response?.status || 502;
      safeError.metaCode = metaError?.code;
      safeError.metaDetails = metaError?.error_user_msg || metaError?.error_data?.details;
      throw safeError;
    }
  }

  // Seed default templates for demo/development
  getSeededTemplates() {
    return [
      {
        id: 'mock_tpl_order_confirm',
        name: 'order_confirmation',
        category: 'UTILITY',
        language: 'en_US',
        status: 'APPROVED',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Order Confirmed! 🎉'
          },
          {
            type: 'BODY',
            text: 'Hello {{1}}, thank you for your order! Your order ID is {{2}} and we are preparing it. We will notify you once it ships.'
          },
          {
            type: 'FOOTER',
            text: 'Thank you for shopping with us.'
          }
        ]
      },
      {
        id: 'mock_tpl_order_shipped',
        name: 'order_shipped',
        category: 'UTILITY',
        language: 'en_US',
        status: 'APPROVED',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Your Order has Shipped! 🚚'
          },
          {
            type: 'BODY',
            text: 'Hi {{1}}, good news! Your order {{2}} has been shipped via {{3}}. You can track it using number: {{4}}.'
          },
          {
            type: 'FOOTER',
            text: 'Need help? Contact support.'
          }
        ]
      },
      {
        id: 'mock_tpl_order_delivered',
        name: 'order_delivered',
        category: 'UTILITY',
        language: 'en_US',
        status: 'APPROVED',
        components: [
          {
            type: 'HEADER',
            format: 'TEXT',
            text: 'Order Delivered! 🎁'
          },
          {
            type: 'BODY',
            text: 'Hi {{1}}, your order {{2}} has been delivered. We hope you love your products!'
          },
          {
            type: 'FOOTER',
            text: 'Share your feedback with us.'
          }
        ]
      },
      {
        id: 'mock_tpl_feedback',
        name: 'feedback_request',
        category: 'MARKETING',
        language: 'en_US',
        status: 'APPROVED',
        components: [
          {
            type: 'BODY',
            text: 'Hello {{1}}, how was your shopping experience with us? Please let us know if you have any feedback!'
          }
        ]
      }
    ];
  }

  // Send document via WhatsApp Cloud API
  async sendDocument(phoneNumber, documentUrl, filename, customCredentials = null) {
    let accessToken;
    let phoneNumberId;
    let isConfig;

    if (customCredentials) {
      accessToken = customCredentials.accessToken;
      phoneNumberId = customCredentials.phoneNumberId;
      isConfig = !!(accessToken && phoneNumberId);
    } else {
      const systemSettings = await this.getSystemSettings();
      accessToken = systemSettings.accessToken;
      phoneNumberId = systemSettings.phoneNumberId;
      isConfig = (accessToken && accessToken !== 'YOUR_ACCESS_TOKEN') && (phoneNumberId && phoneNumberId !== 'YOUR_PHONE_NUMBER_ID');
    }

    if (!isConfig) {
      console.error('❌ WhatsApp Cloud API not configured for sending document!');
      return {
        success: false,
        error: 'WhatsApp API credentials not configured. Please update settings.'
      };
    }

    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;

      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber.replace(/\D/g, ''),
        type: 'document',
        document: {
          link: documentUrl,
          filename: filename
        }
      };

      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.post(url, data, config);
      console.log(`✅ Document ${filename} sent to ${phoneNumber}`);
      return {
        success: true,
        messageId: response.data.messages[0].id
      };

    } catch (error) {
      console.error('❌ Error sending document:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  // Verify custom WhatsApp Cloud API credentials
  async verifyCredentials(customCredentials) {
    const accessToken = customCredentials?.accessToken || this.accessToken;
    const phoneNumberId = customCredentials?.phoneNumberId || this.phoneNumberId;

    if (!accessToken || accessToken === 'YOUR_ACCESS_TOKEN' || !phoneNumberId || phoneNumberId === 'YOUR_PHONE_NUMBER_ID') {
      return {
        success: false,
        error: 'Credentials are not configured.'
      };
    }

    try {
      const url = `${this.baseUrl}/${phoneNumberId}`;
      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      };
      
      const response = await axios.get(url, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Credentials verification failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

const whatsappCloudAPI = new WhatsAppCloudAPI();

module.exports = whatsappCloudAPI;

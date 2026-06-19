// WhatsApp Cloud API Integration
// This is the real production integration with WhatsApp Business API

const axios = require('axios');

class WhatsAppCloudAPI {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'YOUR_BUSINESS_ACCOUNT_ID';
    this.webhookVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'webhook_token_123';
    this.baseUrl = 'https://graph.facebook.com/v18.0';
    this.isConfigured = this.accessToken !== 'YOUR_ACCESS_TOKEN' && this.phoneNumberId !== 'YOUR_PHONE_NUMBER_ID';
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

      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber.replace(/\D/g, ''), // Remove non-digits
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
      
      console.log(`✅ Message sent to ${phoneNumber}`);
      console.log('Response:', response.data);
      
      return {
        success: true,
        messageId: response.data.messages[0].id,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('❌ Error sending message:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
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
  async sendTemplateMessage(phoneNumber, templateName, templateLanguage = 'en_US', parameters = [], customCredentials = null) {
    const accessToken = customCredentials?.accessToken || this.accessToken;
    const phoneNumberId = customCredentials?.phoneNumberId || this.phoneNumberId;
    const isConfig = (customCredentials?.accessToken && customCredentials?.phoneNumberId) || this.isConfigured;

    // If not configured, return mock success (helpful for local dev / testing)
    if (!isConfig) {
      console.log(`⚠️ WhatsApp Cloud API not configured. Simulating template message dispatch:`);
      console.log(`   To: ${phoneNumber}`);
      console.log(`   Template: ${templateName} [${templateLanguage}]`);
      console.log(`   Parameters:`, JSON.stringify(parameters, null, 2));
      return { 
        success: true, 
        messageId: 'mock_tpl_wamid_' + Math.random().toString(36).substr(2, 9) 
      };
    }

    try {
      const url = `${this.baseUrl}/${phoneNumberId}/messages`;

      // Map parameters to Meta format components (body text placeholders)
      const formattedParameters = parameters.map(p => {
        if (typeof p === 'object' && p !== null && p.type) {
          return p;
        }
        return { type: 'text', text: String(p) };
      });

      const data = {
        messaging_product: 'whatsapp',
        to: phoneNumber.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: templateLanguage
          },
          components: [
            {
              type: 'body',
              parameters: formattedParameters
            }
          ]
        }
      };

      const config = {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.post(url, data, config);
      console.log(`✅ Template message sent to ${phoneNumber}`);
      return { success: true, messageId: response.data.messages[0].id };

    } catch (error) {
      console.error('❌ Error sending template:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
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

      const interactive = {
        type: 'button',
        body: {
          text: bodyText
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
      console.log('⚠️ WhatsApp Cloud API not configured. Returning seeded default templates.');
      return this.getSeededTemplates();
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
      // Fallback to seeded templates on network/auth error during development
      return this.getSeededTemplates();
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

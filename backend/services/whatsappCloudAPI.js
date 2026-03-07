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

  // Send message via WhatsApp Cloud API
  async sendMessage(phoneNumber, message) {
    // Check if API is configured
    if (!this.isConfigured) {
      console.error('❌ WhatsApp Cloud API not configured!');
      console.error('   Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env file');
      return {
        success: false,
        error: 'WhatsApp API credentials not configured. Please update .env file.'
      };
    }

    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

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
          'Authorization': `Bearer ${this.accessToken}`,
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
  async markAsRead(messageId) {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

      const data = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      };

      const config = {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
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
  async sendTemplateMessage(phoneNumber, templateName, templateLanguage = 'en_US', parameters = []) {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

      const data = {
        messaging_product: 'whatsapp',
        to: phoneNumber.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: templateLanguage
          },
          parameters: {
            body: {
              parameters: parameters
            }
          }
        }
      };

      const config = {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.post(url, data, config);
      console.log(`✅ Template message sent to ${phoneNumber}`);
      return { success: true, messageId: response.data.messages[0].id };

    } catch (error) {
      console.error('❌ Error sending template:', error);
      return { success: false, error: error.message };
    }
  }

  // Send interactive message with buttons
  async sendInteractiveMessage(phoneNumber, headerText, bodyText, footerText, buttons) {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;

      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber.replace(/\D/g, ''),
        type: 'interactive',
        interactive: {
          type: 'button',
          header: {
            type: 'text',
            text: headerText
          },
          body: {
            text: bodyText
          },
          footer: {
            text: footerText
          },
          action: {
            buttons: buttons.map((btn, idx) => ({
              type: 'reply',
              reply: {
                id: `btn_${idx}`,
                title: btn
              }
            }))
          }
        }
      };

      const config = {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      const response = await axios.post(url, data, config);
      console.log(`✅ Interactive message sent to ${phoneNumber}`);
      return { success: true, messageId: response.data.messages[0].id };

    } catch (error) {
      console.error('❌ Error sending interactive message:', error);
      return { success: false, error: error.message };
    }
  }

  // Get business phone number details
  async getPhoneNumberDetails() {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}`;
      
      const config = {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
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
  async getMedia(mediaId) {
    try {
      const url = `${this.baseUrl}/${mediaId}`;
      
      const config = {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
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
  async uploadMedia(phoneNumberId, mediaFile, mediaType = 'image') {
    try {
      const url = `${this.baseUrl}/${phoneNumberId}/media`;
      
      const formData = new FormData();
      formData.append('file', mediaFile);
      formData.append('type', mediaType); // image, audio, video, document

      const config = {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
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
}

const whatsappCloudAPI = new WhatsAppCloudAPI();

module.exports = whatsappCloudAPI;

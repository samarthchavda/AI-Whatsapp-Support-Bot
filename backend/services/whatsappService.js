// Simulated WhatsApp Service
// In production, this would use whatsapp-web.js or WhatsApp Business API

const aiService = require('./aiService');
const Conversation = require('../models/Conversation');

class WhatsAppService {
  constructor() {
    this.isReady = true;
    this.messageQueue = [];
  }

  initialize() {
    console.log('✅ WhatsApp API Service initialized');
    console.log('🔗 Ready to receive messages via webhook');
    this.isReady = true;
  }

  async handleIncomingMessage(message) {
    try {
      const customerPhone = message.from;
      const messageContent = message.body || message.text;

      if (!messageContent) {
        return;
      }

      console.log(`📨 Message from ${customerPhone}: ${messageContent}`);

      // Process message with AI service
      const startTime = Date.now();
      const response = await aiService.processMessage({
        customerPhone,
        customerName: message.contactName || 'Customer',
        message: messageContent
      });
      const responseTime = Date.now() - startTime;

      console.log(`🤖 AI Response (${responseTime}ms): ${response.message}`);

      // Log conversation
      await this.logConversation({
        customerPhone,
        customerName: message.contactName || 'Customer',
        userMessage: messageContent,
        assistantMessage: response.message,
        intent: response.intent,
        escalated: response.escalated,
        escalationReason: response.escalationReason,
        relatedOrderIds: response.relatedOrderIds,
        metadata: {
          aiModel: 'gpt-3.5-turbo',
          responseTime
        }
      });

      return response;

    } catch (error) {
      console.error('❌ Error handling message:', error);
      return {
        message: 'Sorry, I encountered an error. Please try again or contact our support team.',
        success: false
      };
    }
  }

  async logConversation(data) {
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
        timestamp: new Date()
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

      if (data.relatedOrderIds && data.relatedOrderIds.length > 0) {
        conversation.relatedOrderIds = [
          ...new Set([...conversation.relatedOrderIds, ...data.relatedOrderIds])
        ];
      }

      if (data.metadata) {
        conversation.metadata = {
          ...conversation.metadata,
          ...data.metadata
        };
      }

      await conversation.save();
      console.log('💾 Conversation logged successfully');

    } catch (error) {
      console.error('❌ Error logging conversation:', error);
    }
  }

  async sendMessage(phoneNumber, message) {
    try {
      console.log(`📤 Would send message to ${phoneNumber}: ${message}`);
      return { success: true, message: 'Message queued for sending' };
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      service: 'WhatsApp API Service',
      queueLength: this.messageQueue.length
    };
  }
}

const whatsappService = new WhatsAppService();

module.exports = whatsappService;

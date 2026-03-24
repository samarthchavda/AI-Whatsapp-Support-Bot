// WhatsApp Web Bot - Lightweight version (without Puppeteer dependency)
// For full WhatsApp integration, install: npm install whatsapp-web.js qrcode-terminal

const Order = require('../models/Order');
const Conversation = require('../models/Conversation');
const Escalation = require('../models/Escalation');
const aiService = require('./aiService');

class WhatsAppWebBot {
  constructor() {
    this.isReady = false;
    this.client = null;
    this.startedAt = Date.now();
    this.io = null;
  }

  initialize(io) {
    this.io = io;
    console.log('🚀 Initializing WhatsApp Web Bot...');
    
    // Try to load whatsapp-web.js if available
    try {
      const { Client, LocalAuth } = require('whatsapp-web.js');
      const fs = require('fs');
      const path = require('path');
      
      // Check if session already exists
      const sessionPath = path.join(process.cwd(), '.wwebjs_auth', 'session');
      const hasExistingSession = fs.existsSync(sessionPath);
      
      if (hasExistingSession) {
        console.log('📱 Found existing WhatsApp session - attempting to restore...');
        this.emitStatus('restoring', 'Restoring previous session...');
      } else {
        console.log('⚠️  No previous session found - you will need to scan QR code');
        this.emitStatus('waiting_qr', 'Waiting for QR code...');
      }
      
      console.log('📱 Starting WhatsApp Web Session...');
      
      this.client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        }
      });

      // QR Code Event
      this.client.on('qr', (qr) => {
        try {
          const qrcode = require('qrcode-terminal');
          console.log('\n' + '='.repeat(50));
          console.log('📱 SCAN THIS QR CODE WITH WhatsApp');
          console.log('='.repeat(50) + '\n');
          qrcode.generate(qr, { small: true });
          console.log('\n' + '='.repeat(50));
          console.log('After scanning, the bot will connect automatically');
          console.log('='.repeat(50) + '\n');
          
          // Emit QR code to frontend
          this.emitQRCode(qr);
        } catch (err) {
          console.error('❌ Error displaying QR code:', err.message);
          console.log('QR Code String:', qr);
          this.emitQRCode(qr);
        }
      });

      // Authenticated Event
      this.client.on('authenticated', () => {
        console.log('✅ Session authenticated successfully!');
        this.emitStatus('authenticated', 'Session authenticated successfully!');
      });

      // Ready Event
      this.client.on('ready', () => {
        console.log('\n' + '='.repeat(60));
        console.log('✅ WhatsApp Bot is Ready!');
        console.log('🟢 Now listening for incoming messages...');
        console.log('📱 Send "hii" or any message to test');
        console.log('='.repeat(60) + '\n');
        this.isReady = true;
        this.startedAt = Date.now();
        this.emitStatus('ready', 'WhatsApp Bot is ready and listening for messages!');
      });

      // Disconnected Event
      this.client.on('disconnected', (reason) => {
        console.log('🔴 WhatsApp disconnected. Reason:', reason);
        this.isReady = false;
        this.emitStatus('disconnected', 'WhatsApp disconnected. Please restart the server.');
      });

      // Message Event
      this.client.on('message', async (message) => {
        try {
          await this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error handling message:', error.message);
        }
      });

      // Initialize without crashing the whole backend on puppeteer/session issues.
      this.client.initialize().catch((error) => {
        this.isReady = false;
        console.error('❌ WhatsApp initialization failed:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('   1. Check if Chrome/Chromium is installed');
        console.log('   2. Try resetting session: npm run reset-session');
        console.log('   3. Check Node.js version (>= 14 required)');
      });
      
    } catch (error) {
      console.log('⚠️  WhatsApp Web Bot disabled');
      console.log('Error:', error.message);
      console.log('\n🔧 Setup Instructions:');
      console.log('   1. npm install whatsapp-web.js qrcode-terminal puppeteer');
      console.log('   2. npm run dev');
      console.log('   3. Scan the QR code with WhatsApp');
      console.log('\n🎯 Using Demo Chat Mode instead');
      this.isReady = false;
    }
  }

  async handleMessage(message) {
    try {
      if (this.shouldIgnoreMessage(message)) {
        return;
      }

      if (this.isStaleMessage(message)) {
        return;
      }

      const senderPhone = message.from;
      const senderName = (await message.getContact()).pushname || 'Customer';
      const messageText = message.body.trim();

      if (!messageText || messageText === '') {
        console.log(`📨 ${senderName}: [Empty message - ignored]`);
        return;
      }

      const normalizedPhone = this.normalizePhoneNumber(senderPhone);
      
      console.log(`\n📨 ${senderName} (${normalizedPhone}): ${message.body}`);

      // Use AI Service to process message
      const result = await aiService.processMessage({
        customerPhone: normalizedPhone,
        customerName: senderName,
        message: messageText
      });
      
      const botReply = result.message;
      
      // Send reply
      if (botReply && botReply.trim()) {
        await message.reply(botReply);
        console.log(`🤖 Reply sent: "${botReply.substring(0, 50)}..." (intent: ${result.intent})`);
        
        // Log conversation
        await this.logConversation({
          customerPhone: normalizedPhone,
          customerName: senderName,
          userMessage: messageText,
          assistantMessage: botReply,
          intent: result.intent,
          escalated: result.escalated,
          escalationReason: result.escalationReason,
          relatedOrderIds: result.relatedOrderIds || []
        });
      } else {
        console.error('⚠️ Empty bot reply received');
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      await message.reply('Sorry, I encountered an error. Please try again or contact support.');
    }
  }

  shouldIgnoreMessage(message) {
    const from = message?.from || '';
    const isStatusChat = from === 'status@broadcast' || from.endsWith('@broadcast');
    const isOwnMessage = Boolean(message?.fromMe);
    return isStatusChat || isOwnMessage;
  }

  isStaleMessage(message) {
    if (!message || !message.timestamp) {
      return false;
    }

    const msgTimeMs = Number(message.timestamp) * 1000;
    if (Number.isNaN(msgTimeMs)) {
      return false;
    }

    // Allow a small clock skew while blocking old backlog on reconnect.
    return msgTimeMs < (this.startedAt - 15000);
  }

  normalizePhoneNumber(whatsappId) {
    // WhatsApp sends: 919054167563@c.us or 9054167563@c.us
    // Remove @c.us and any non-digit characters
    let phone = whatsappId.replace(/@c\.us$/, '').replace(/\D/g, '');
    
    // Ensure it has country code (91 for India)
    if (phone.length === 10) {
      phone = '91' + phone; // Add India code if missing
    }
    
    return phone;
  }

  async logConversation({
    customerPhone,
    customerName,
    userMessage,
    assistantMessage,
    intent = 'other',
    escalated = false,
    escalationReason = null,
    relatedOrderIds = []
  }) {
    try {
      const allowedIntents = new Set([
        'order_status',
        'cancel_order',
        'return_policy',
        'refund_request',
        'complaint',
        'general_inquiry',
        'other'
      ]);
      const safeIntent = allowedIntents.has(intent) ? intent : 'other';

      // Ensure we have valid content
      if (!userMessage || userMessage.trim() === '') {
        userMessage = '[Empty message]';
      }
      if (!assistantMessage || assistantMessage.trim() === '') {
        assistantMessage = '[No response]';
      }

      let conversation = await Conversation.findOne({
        customerPhone,
        status: { $in: ['active', 'escalated'] }
      });

      if (!conversation) {
        conversation = new Conversation({
          customerPhone,
          customerName,
          messages: [],
          status: 'active',
          escalated: false,
          escalationReason: null
        });
      }

      // Add user message
      conversation.messages.push({
        role: 'user',
        content: userMessage.trim(),
        timestamp: new Date(),
        intent: safeIntent
      });

      // Add assistant response
      conversation.messages.push({
        role: 'assistant',
        content: assistantMessage.trim(),
        timestamp: new Date(),
        intent: safeIntent
      });

      if (escalated) {
        conversation.escalated = true;
        conversation.escalationReason = escalationReason || 'other';
        conversation.escalatedAt = new Date();
        conversation.status = 'escalated';
      }

      if (Array.isArray(relatedOrderIds) && relatedOrderIds.length > 0) {
        conversation.relatedOrderIds = [
          ...new Set([...(conversation.relatedOrderIds || []), ...relatedOrderIds])
        ];
      }

      const saved = await conversation.save();
      console.log(`💾 Logged conversation for ${customerName}`);
      return saved;
    } catch (error) {
      console.error('Error logging conversation:', error.message);
    }
  }

  async sendMessage(phoneNumber, message) {
    try {
      if (!this.client) {
        return { success: false, error: 'Bot not available' };
      }
      
      const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
      await this.client.sendMessage(chatId, message);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getStatus() {
    return {
      service: 'WhatsApp Web Bot',
      status: this.isReady ? '🟢 Online' : '⚠️ Demo Mode',
      isReady: this.isReady,
      timestamp: new Date()
    };
  }

  emitQRCode(qr) {
    if (this.io) {
      this.io.emit('whatsapp-qr', { qr, timestamp: new Date() });
      console.log('📤 QR code sent to frontend');
    }
  }

  emitStatus(status, message) {
    if (this.io) {
      this.io.emit('whatsapp-status', {
        status,
        message,
        isReady: this.isReady,
        timestamp: new Date()
      });
      console.log(`📤 Status update sent to frontend: ${status}`);
    }
  }
}

const whatsappWebBot = new WhatsAppWebBot();
module.exports = whatsappWebBot;


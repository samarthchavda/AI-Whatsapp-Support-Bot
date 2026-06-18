// WhatsApp Web Bot - Lightweight version (without Puppeteer dependency)
// For full WhatsApp integration, install: npm install whatsapp-web.js qrcode-terminal

const Order = require('../models/Order');
const Conversation = require('../models/Conversation');
const Escalation = require('../models/Escalation');
const Admin = require('../models/Admin');
const aiService = require('./aiService');

class WhatsAppWebBot {
  constructor() {
    this.isReady = false;
    this.client = null;
    this.startedAt = Date.now();
    this.io = null;
    this.status = 'disconnected';
    this.qrCode = null;
  }

  initialize(io) {
    this.io = io;
    this.status = 'connecting';
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
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1041096482-alpha.html',
        },
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
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

      // Check if the customer has any orders in the database
      const phoneFormats = aiService.getPhoneFormats(normalizedPhone);
      const exactClauses = phoneFormats.map((value) => ({ customerPhone: value }));
      const regexClauses = phoneFormats
        .map((value) => value.replace(/\D/g, ''))
        .filter((value) => value.length >= 10)
        .map((digits) => {
          const flexiblePattern = digits.split('').join('\\D*');
          return { customerPhone: { $regex: flexiblePattern } };
        });
      const phoneQuery = { $or: [...exactClauses, ...regexClauses] };
      const orderExists = await Order.exists(phoneQuery);

      if (!orderExists) {
        // If they don't have orders, check if they provided a valid Order ID in their message
        const requestedOrderId = aiService.extractOrderId(messageText);
        let orderByOrderId = null;
        if (requestedOrderId) {
          orderByOrderId = await Order.findOne({ orderId: requestedOrderId });
        }

        if (!orderByOrderId) {
          console.log(`⚠️ Phone number ${normalizedPhone} not found in database. Sending professional fallback response.`);
          const professionalFallbackMsg = `Dear ${senderName},\n\nThank you for contacting our customer support.\n\nWe were unable to find any active orders associated with your phone number (${normalizedPhone}) in our database.\n\nTo help us assist you, please:\n• Verify that you are messaging from the same phone number used during checkout.\n• If you checked out using a different number, please reply directly with your Order ID (e.g., ORD-001).\n\nIf you have any questions or need further assistance, please let us know.\n\nBest regards,\nCustomer Support Team`;
          
          const sentMsg = await this.client.sendMessage(message.from, professionalFallbackMsg);
          
          // Log conversation
          await this.logConversation({
            customerPhone: normalizedPhone,
            customerName: senderName,
            userMessage: messageText,
            assistantMessage: professionalFallbackMsg,
            intent: 'other',
            escalated: false,
            userMessageId: message.id?.id,
            assistantMessageId: sentMsg?.id?.id
          });
          return;
        }
      }

      // Use AI Service to process message
      const result = await aiService.processMessage({
        customerPhone: normalizedPhone,
        customerName: senderName,
        message: messageText,
        messageId: message.id?.id
      });
      
      if (result.botPaused) {
        if (result.message) {
          console.log(`🤖 Sending system/limit message via web bot: ${result.message}`);
          await this.client.sendMessage(message.from, result.message);
        }
        console.log(`🔕 Conversation with ${normalizedPhone} is in agent takeover/paused. AI response skipped.`);
        return;
      }
      
      const botReply = result.message;
      
      // Send reply
      if (botReply && botReply.trim()) {
        const sentMsg = await this.client.sendMessage(message.from, botReply);
        console.log(`🤖 Reply sent: "${botReply.substring(0, 50)}..." (intent: ${result.intent})`);
        
        // Update the assistant message in conversation with the actual WhatsApp messageId
        if (sentMsg && sentMsg.id && sentMsg.id.id) {
          const conversation = await Conversation.findOne({ customerPhone: normalizedPhone }).sort({ updatedAt: -1 });
          if (conversation && conversation.messages.length > 0) {
            for (let i = conversation.messages.length - 1; i >= 0; i--) {
              if (conversation.messages[i].role === 'assistant') {
                conversation.messages[i].messageId = sentMsg.id.id;
                conversation.messages[i].status = 'sent';
                await conversation.save();
                break;
              }
            }
          }
        }
      } else {
        console.error('⚠️ Empty bot reply received');
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      try {
        await this.client.sendMessage(message.from, 'Sorry, I encountered an error. Please try again or contact support.');
      } catch (sendErr) {
        console.error('❌ Failed to send error message:', sendErr.message);
      }
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
    relatedOrderIds = [],
    userMessageId = null,
    assistantMessageId = null
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
        let adminDoc = await Admin.findOne({ email: 'demo@store.com' });
        if (!adminDoc) adminDoc = await Admin.findOne();

        conversation = new Conversation({
          admin: adminDoc ? adminDoc._id : null,
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
        intent: safeIntent,
        messageId: userMessageId
      });

      // Add assistant response
      conversation.messages.push({
        role: 'assistant',
        content: assistantMessage.trim(),
        timestamp: new Date(),
        intent: safeIntent,
        messageId: assistantMessageId,
        status: assistantMessageId ? 'sent' : 'sent'
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
      if (!this.client || !this.isReady) {
        return { success: false, error: 'Bot not available or not ready' };
      }
      
      let chatId = phoneNumber;
      if (!chatId.includes('@c.us')) {
        try {
          const numberId = await this.client.getNumberId(phoneNumber);
          if (numberId) {
            chatId = numberId._serialized;
          } else {
            chatId = `${phoneNumber}@c.us`;
          }
        } catch (err) {
          console.warn(`⚠️ Failed to resolve number JID for ${phoneNumber}, using fallback:`, err.message);
          chatId = `${phoneNumber}@c.us`;
        }
      }
      
      await this.client.sendMessage(chatId, message, { sendSeen: false });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getStatus() {
    return {
      service: 'WhatsApp Web Bot',
      status: this.status || (this.isReady ? 'ready' : 'disconnected'),
      isReady: this.isReady,
      qrCode: this.qrCode,
      timestamp: new Date()
    };
  }

  emitQRCode(qr) {
    this.qrCode = qr;
    this.status = 'qr_ready';
    if (this.io) {
      this.io.emit('whatsapp-qr', { qr, timestamp: new Date() });
      console.log('📤 QR code sent to frontend');
    }
  }

  emitStatus(status, message) {
    this.status = status;
    if (status === 'ready' || status === 'disconnected' || status === 'error') {
      this.qrCode = null;
    }
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


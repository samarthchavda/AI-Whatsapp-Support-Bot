const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const ReturnPolicy = require('../models/ReturnPolicy');
const Escalation = require('../models/Escalation');
const Conversation = require('../models/Conversation');
const AILog = require('../models/AILog');
const KnowledgeBase = require('../models/KnowledgeBase');
const Admin = require('../models/Admin');
const knowledgeBaseService = require('./knowledgeBaseService');

class AIService {
  constructor() {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiModelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.gemini = geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here'
      ? new GoogleGenerativeAI(geminiApiKey)
      : null;

    const apiKey = process.env.OPENAI_API_KEY;
    this.openaiModelName = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.openai = apiKey && apiKey !== 'your_openai_api_key_here' && apiKey !== 'sk-test-key'
      ? new OpenAI({ apiKey })
      : null;
    
    this.highPriorityKeywords = (process.env.HIGH_PRIORITY_KEYWORDS || 'urgent,critical,emergency,refund,complaint,angry,frustrated,unacceptable')
      .toLowerCase()
      .split(',')
      .map(k => k.trim());

    // In-memory cache keeps repeated WhatsApp questions off the Gemini/OpenAI path.
    // This can be swapped for Redis later without changing the public AIService API.
    this.responseCache = new Map();
    this.responseCacheTtlMs = Number(process.env.AI_RESPONSE_CACHE_TTL_MS || 10 * 60 * 1000);
    this.responseCacheMaxEntries = Number(process.env.AI_RESPONSE_CACHE_MAX_ENTRIES || 2000);

    // Simple sliding-window rate limit per customer phone number.
    this.customerRateLimits = new Map();
    this.maxMessagesPerMinute = Number(process.env.AI_MAX_MESSAGES_PER_MINUTE || 10);
    this.rateLimitWindowMs = 60 * 1000;

    this.maxRecentMessages = Number(process.env.AI_RECENT_MESSAGES || 5);
    this.minTypingDelayMs = Number(process.env.AI_MIN_TYPING_DELAY_MS || 300);
    this.maxTypingDelayMs = Number(process.env.AI_MAX_TYPING_DELAY_MS || 800);
    this.maxResponseSplitLength = Number(process.env.AI_RESPONSE_SPLIT_LENGTH || 220);
    this.maxOutputTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS || 180);
  }

  normalizeMessage(message = '') {
    return message.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  getCacheKey(customerPhone, message) {
    return `${customerPhone}::${this.normalizeMessage(message)}`;
  }

  cleanupExpiredCacheEntries() {
    const now = Date.now();

    for (const [key, entry] of this.responseCache.entries()) {
      if (entry.expiresAt <= now) {
        this.responseCache.delete(key);
      }
    }
  }

  getCachedResponse(cacheKey) {
    this.cleanupExpiredCacheEntries();
    const entry = this.responseCache.get(cacheKey);

    if (!entry) {
      console.log(`CACHE MISS | key=${cacheKey}`);
      return null;
    }

    console.log(`CACHE HIT | key=${cacheKey}`);
    return entry.payload;
  }

  setCachedResponse(cacheKey, payload) {
    this.cleanupExpiredCacheEntries();

    if (this.responseCache.size >= this.responseCacheMaxEntries) {
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey) {
        this.responseCache.delete(oldestKey);
      }
    }

    this.responseCache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + this.responseCacheTtlMs
    });
  }

  checkCustomerRateLimit(customerPhone) {
    const now = Date.now();
    const windowStart = now - this.rateLimitWindowMs;
    const timestamps = this.customerRateLimits.get(customerPhone) || [];
    const activeTimestamps = timestamps.filter((timestamp) => timestamp > windowStart);

    if (activeTimestamps.length >= this.maxMessagesPerMinute) {
      const oldestInWindow = activeTimestamps[0];
      const retryAfterMs = Math.max(0, this.rateLimitWindowMs - (now - oldestInWindow));

      return {
        allowed: false,
        retryAfterMs,
        remaining: 0,
        limit: this.maxMessagesPerMinute
      };
    }

    activeTimestamps.push(now);
    this.customerRateLimits.set(customerPhone, activeTimestamps);

    return {
      allowed: true,
      retryAfterMs: 0,
      remaining: Math.max(0, this.maxMessagesPerMinute - activeTimestamps.length),
      limit: this.maxMessagesPerMinute
    };
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getTypingDelayMs() {
    return Math.floor(
      Math.random() * (this.maxTypingDelayMs - this.minTypingDelayMs + 1)
    ) + this.minTypingDelayMs;
  }

  truncateText(text = '', maxLength = 160) {
    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength - 1).trim()}…`;
  }

  getRecentConversationMessages(conversation, limit = this.maxRecentMessages) {
    const recentMessages = Array.isArray(conversation?.messages)
      ? conversation.messages.slice(-limit)
      : [];

    return recentMessages.map((message) => ({
      role: message.role,
      content: this.truncateText(message.content || '', 180),
      intent: message.intent || 'other',
      timestamp: message.timestamp
    }));
  }

  buildContextualPrompt({ customerName, message, recentMessages }) {
    const contextLines = recentMessages.length > 0
      ? recentMessages.map((entry, index) => {
          return `${index + 1}. ${entry.role}: ${entry.content}`;
        }).join('\n')
      : 'No prior conversation context.';

    return [
      `Customer: ${customerName}`,
      `Recent context:\n${contextLines}`,
      `Current message: ${message}`,
      'Reply in a concise, helpful WhatsApp-friendly style. Do not invent order or policy details.'
    ].join('\n\n');
  }

  buildSystemInstruction(customerName) {
    return `You are a WhatsApp customer support assistant.

Rules:
- Keep replies short, clear, and helpful.
- Use the recent conversation context.
- Never invent order, refund, or policy details.
- Escalate refunds and complaints when appropriate.
- Address the customer naturally: ${customerName}.`;
  }

  buildResponseParts(message) {
    if (!message || message.length <= this.maxResponseSplitLength) {
      return [message];
    }

    const midpoint = Math.floor(message.length / 2);
    const leftBreak = message.lastIndexOf(' ', midpoint);
    const splitIndex = leftBreak > message.length * 0.35 ? leftBreak : midpoint;

    return [
      message.slice(0, splitIndex).trim(),
      message.slice(splitIndex).trim()
    ].filter(Boolean);
  }

  buildResponsePlan(message) {
    const typingDelayMs = this.getTypingDelayMs();
    const responseParts = this.buildResponseParts(message);

    return {
      typingDelayMs,
      responseParts,
      shouldSplit: responseParts.length > 1
    };
  }

  buildAiLogPayload({ conversationId, customerPhone, intent, userMessage, assistantMessage, aiModel, structuredOutput, duration, error }) {
    return {
      conversationId,
      customerPhone,
      intent,
      userMessage,
      assistantMessage,
      aiModel: aiModel || 'none',
      structuredOutput,
      duration,
      error
    };
  }

  validateInput({ customerPhone, customerName, message }) {
    const errors = [];
    
    if (!customerPhone || typeof customerPhone !== 'string' || customerPhone.trim() === '') {
      errors.push('Invalid customer phone number');
    }
    
    if (!customerName || typeof customerName !== 'string' || customerName.trim() === '') {
      errors.push('Invalid customer name');
    }
    
    if (!message || typeof message !== 'string' || message.trim() === '') {
      errors.push('Message cannot be empty');
    }
    
    if (message && message.length > 5000) {
      errors.push('Message is too long (max 5000 characters)');
    }
    
    return { valid: errors.length === 0, errors };
  }

  async processMessage({ customerPhone, customerName, message, messageId }) {
    const startTime = Date.now();
    let conversation = null;
    let aiLogDoc = null;

    try {
      // Validate input
      const validation = this.validateInput({ customerPhone, customerName, message });
      if (!validation.valid) {
        console.error('Input validation failed:', validation.errors);
        throw new Error(validation.errors.join(', '));
      }

      // Rate limit per customer to prevent spam and protect AI spend.
      const rateLimit = this.checkCustomerRateLimit(customerPhone);
      if (!rateLimit.allowed) {
        console.warn(`RATE LIMIT | phone=${customerPhone} retryAfterMs=${rateLimit.retryAfterMs}`);
        return {
          message: `You're sending messages too quickly. Please wait a moment and try again.`,
          intent: 'rate_limited',
          escalated: false,
          escalationReason: null,
          relatedOrderIds: [],
          structuredOutput: {
            intent: 'rate_limited',
            confidence: 1,
            escalated: false,
            escalationReason: null,
            relatedOrderIds: [],
            metadata: {
              responseTime: Date.now() - startTime,
              usedAI: false,
              cacheHit: false,
              modelUsed: 'RateLimit',
              tokenUsage: {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0
              },
              typingDelayMs: 0,
              responseParts: 1,
              retryAfterMs: rateLimit.retryAfterMs,
              dataSource: ['Rate Limiter']
            }
          },
          responseParts: [`You're sending messages too quickly. Please wait a moment and try again.`],
          typingDelayMs: 0
        };
      }

      // Get or create conversation for logging
      conversation = await Conversation.findOne({
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
          status: 'active'
        });
        await conversation.save();
      }

      // Retrieve Admin document
      let adminDoc = null;
      if (conversation.admin) {
        adminDoc = await Admin.findById(conversation.admin);
      }
      if (!adminDoc) {
        adminDoc = await Admin.findOne({ email: 'demo@store.com' }) || await Admin.findOne();
      }

      // Check subscription active and token limit checks
      if (adminDoc) {
        const isSubscriptionSuspended = 
          !adminDoc.isActive || 
          adminDoc.subscriptionStatus === 'inactive' || 
          adminDoc.subscriptionStatus === 'suspended' || 
          adminDoc.subscriptionStatus === 'cancelled';

        if (isSubscriptionSuspended) {
          console.log(`🔕 Subscription suspended/inactive for tenant: ${adminDoc.email}. Skipping AI response.`);
          
          const currentIntent = this.detectIntent(message);
          conversation.messages = conversation.messages || [];
          conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
            intent: currentIntent,
            messageId
          });
          conversation.updatedAt = new Date();
          await conversation.save();

          if (global.io) {
            global.io.emit('new_message', {
              customerPhone,
              role: 'user',
              content: message,
              timestamp: new Date(),
              intent: currentIntent
            });
          }

          return {
            botPaused: true,
            serviceSuspended: true,
            message: "I apologize, but this store's automated support assistant is currently offline. Please check back later or contact customer support directly.",
            intent: currentIntent,
            escalated: conversation.escalated || conversation.status === 'escalated',
            escalationReason: conversation.escalationReason,
            relatedOrderIds: conversation.relatedOrderIds || [],
            structuredOutput: {
              intent: currentIntent,
              metadata: {
                responseTime: Date.now() - startTime,
                usedAI: false,
                serviceSuspended: true
              }
            },
            responseParts: [],
            typingDelayMs: 0
          };
        }

        const isLimitExceeded = adminDoc.geminiTokensUsed >= adminDoc.geminiTokensLimit;
        if (isLimitExceeded) {
          console.log(`🔕 Monthly token limit exceeded for tenant: ${adminDoc.email}. Skipping AI response.`);
          
          const currentIntent = this.detectIntent(message);
          conversation.messages = conversation.messages || [];
          conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
            intent: currentIntent,
            messageId
          });
          conversation.updatedAt = new Date();
          await conversation.save();

          if (global.io) {
            global.io.emit('new_message', {
              customerPhone,
              role: 'user',
              content: message,
              timestamp: new Date(),
              intent: currentIntent
            });
          }

          return {
            botPaused: true,
            limitExceeded: true,
            message: "I apologize, but the automated support assistant is temporarily unavailable due to high query volume. A customer service representative will contact you shortly.",
            intent: currentIntent,
            escalated: conversation.escalated || conversation.status === 'escalated',
            escalationReason: conversation.escalationReason,
            relatedOrderIds: conversation.relatedOrderIds || [],
            structuredOutput: {
              intent: currentIntent,
              metadata: {
                responseTime: Date.now() - startTime,
                usedAI: false,
                limitExceeded: true
              }
            },
            responseParts: [],
            typingDelayMs: 0
          };
        }
      }

      // If the conversation is paused or escalated, skip AI generation and save the message
      if (conversation.botPaused || conversation.escalated || conversation.status === 'escalated') {
        console.log(`🔕 Bot is PAUSED/ESCALATED for ${customerPhone}. Skipping AI response generation.`);
        
        const currentIntent = this.detectIntent(message);
        
        conversation.messages = conversation.messages || [];
        conversation.messages.push({
          role: 'user',
          content: message,
          timestamp: new Date(),
          intent: currentIntent,
          messageId
        });
        
        if (conversation.messages.length > 50) {
          conversation.messages = conversation.messages.slice(-50);
        }
        
        conversation.updatedAt = new Date();
        await conversation.save();
        
        // Emit socket event so frontend updates in real-time
        if (global.io) {
          global.io.emit('new_message', {
            customerPhone,
            role: 'user',
            content: message,
            timestamp: new Date(),
            intent: currentIntent
          });
        }
        
        return {
          botPaused: true,
          message: null,
          intent: currentIntent,
          escalated: conversation.escalated || conversation.status === 'escalated',
          escalationReason: conversation.escalationReason,
          relatedOrderIds: conversation.relatedOrderIds || [],
          structuredOutput: {
            intent: currentIntent,
            metadata: {
              responseTime: Date.now() - startTime,
              usedAI: false,
              botPaused: true
            }
          },
          responseParts: [],
          typingDelayMs: 0
        };
      }

      // Detect intent
      const intent = this.detectIntent(message);
      
      // Check for high priority/escalation keywords
      const needsEscalation = this.checkForEscalation(message, intent);
      
      let response = '';
      let relatedOrderIds = [];
      let escalated = false;
      let escalationReason = null;
      let usedAI = false;
      let aiModel = null;
      let modelUsed = 'Fallback';
      let cacheHit = false;
      let cacheRecord = null;
      let tokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      };
      let typingDelayMs = 0;
      let responseParts = [];

      // Process based on intent
      switch (intent) {
        case 'order_status':
          const orderResult = await this.handleOrderStatusQuery(customerPhone, message);
          response = orderResult.message;
          relatedOrderIds = orderResult.orderIds || [];
          break;

        case 'cancel_order':
          const cancelResult = await this.handleCancelOrderRequest(customerPhone, message);
          response = cancelResult.message;
          relatedOrderIds = cancelResult.orderIds || [];
          break;

        case 'return_policy':
          response = await this.handleReturnPolicyQuery(message);
          break;

        case 'refund_request':
          const refundResult = await this.handleRefundRequest(customerPhone, customerName, message);
          response = refundResult.message;
          relatedOrderIds = refundResult.orderIds || [];
          escalated = true;
          escalationReason = 'refund_request';
          break;

        case 'complaint':
          response = await this.handleComplaint(customerPhone, customerName, message);
          escalated = true;
          escalationReason = 'complaint';
          break;

        case 'general_inquiry':
        default:
          if (needsEscalation) {
            response = await this.handleEscalation(customerPhone, customerName, message, 'high_priority');
            escalated = true;
            escalationReason = 'high_priority';
          } else {
            const cacheKey = this.getCacheKey(customerPhone, message);
            const cachedResponse = this.getCachedResponse(cacheKey);

            if (cachedResponse) {
              cacheHit = true;
              response = cachedResponse.message;
              usedAI = cachedResponse.usedAI;
              aiModel = cachedResponse.model || null;
              modelUsed = cachedResponse.modelUsed || 'Cache';
              tokenUsage = cachedResponse.tokenUsage || tokenUsage;
              typingDelayMs = cachedResponse.typingDelayMs || 0;
              responseParts = cachedResponse.responseParts || [];
              cacheRecord = cachedResponse;
            } else {
              const recentMessages = this.getRecentConversationMessages(conversation, this.maxRecentMessages);
              const aiResult = await this.handleGeneralInquiry(message, customerName, recentMessages, conversation.admin);
              response = aiResult.message;
              usedAI = aiResult.usedAI;
              aiModel = aiResult.model || null;
              modelUsed = aiResult.modelUsed || (aiResult.usedAI ? 'AI' : 'Fallback');
              tokenUsage = aiResult.tokenUsage || tokenUsage;
              typingDelayMs = aiResult.typingDelayMs || 0;
              responseParts = aiResult.responseParts || [];

              cacheRecord = {
                message: response,
                usedAI,
                model: aiModel,
                modelUsed,
                tokenUsage,
                responseParts,
                typingDelayMs
              };

              this.setCachedResponse(cacheKey, cacheRecord);
            }
          }
          break;
      }

      // Create escalation if needed
      if (escalated) {
        await this.createEscalation({
          customerPhone,
          customerName,
          message,
          reason: escalationReason,
          relatedOrderIds
        });
      }

      // Simulate streaming-like UX for WhatsApp by adding a short typing delay.
      if (!typingDelayMs) {
        typingDelayMs = this.getTypingDelayMs();
      }

      if (!responseParts || responseParts.length === 0) {
        responseParts = this.buildResponseParts(response);
      }

      if (typingDelayMs > 0) {
        await this.sleep(typingDelayMs);
      }

      // Persist the latest exchange so future prompts can use only the last few messages.
      conversation.messages = conversation.messages || [];
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date(),
        intent,
        messageId
      });
      conversation.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        intent
      });

      if (conversation.messages.length > 50) {
        conversation.messages = conversation.messages.slice(-50);
      }

      if (escalated) {
        conversation.status = 'escalated';
        conversation.escalated = true;
        conversation.escalatedAt = new Date();
        conversation.escalationReason = escalationReason;
      }

      await conversation.save();

      const duration = Date.now() - startTime;
      
      // Create structured output
      const structuredOutput = {
        intent,
        confidence: this.calculateIntentConfidence(message, intent),
        escalated,
        escalationReason,
        relatedOrderIds,
        metadata: {
          responseTime: duration,
          usedAI,
          cacheHit,
          modelUsed: cacheHit ? 'Cache' : modelUsed,
          tokenUsage,
          typingDelayMs,
          responseParts: responseParts.length,
          dataSource: cacheHit ? ['Response Cache'] : this.getDataSources(intent, usedAI)
        }
      };

      // Log this interaction in AILog collection
      aiLogDoc = new AILog(this.buildAiLogPayload({
        conversationId: conversation._id,
        customerPhone,
        intent,
        userMessage: message,
        assistantMessage: response,
        aiModel: aiModel || structuredOutput.metadata.modelUsed,
        structuredOutput,
        duration,
        error: { occurred: false }
      }));
      await aiLogDoc.save();

      // Increment admin usage metrics in database
      if (adminDoc) {
        adminDoc.totalMessagesProcessed = (adminDoc.totalMessagesProcessed || 0) + 1;
        if (tokenUsage && tokenUsage.totalTokens > 0) {
          adminDoc.geminiTokensUsed = (adminDoc.geminiTokensUsed || 0) + tokenUsage.totalTokens;
        }
        await adminDoc.save();
        console.log(`📊 Updated usage for admin ${adminDoc.email}: tokensUsed=${adminDoc.geminiTokensUsed}, messages=${adminDoc.totalMessagesProcessed}`);
      }

      return {
        message: response,
        intent,
        escalated,
        escalationReason,
        relatedOrderIds,
        structuredOutput,
        responseParts,
        typingDelayMs
      };

    } catch (error) {
      console.error('Error processing message:', error);
      
      // Log error
      if (aiLogDoc) {
        aiLogDoc.error = {
          occurred: true,
          message: error.message,
          code: 'MESSAGE_PROCESSING_ERROR'
        };
        aiLogDoc.duration = Date.now() - startTime;
        await aiLogDoc.save().catch(e => console.error('Failed to log error:', e));
      }

      return {
        message: "I apologize, but I'm having trouble processing your request right now. A customer service representative will contact you shortly.",
        intent: 'error',
        escalated: true,
        escalationReason: 'system_error',
        relatedOrderIds: [],
        structuredOutput: {
          intent: 'error',
          escalated: true,
          escalationReason: 'system_error',
          metadata: {
            error: error.message
          }
        }
      };
    }
  }

  detectIntent(message) {
    const lowerMessage = message.toLowerCase();

    // Direct order ID lookup (e.g., ORD-013)
    if (/^\s*ord-\d+\s*$/i.test(lowerMessage)) {
      return 'order_status';
    }

    // Cancel order patterns
    const cancelPatterns = /cancel order|cancel my order|order cancel|can i cancel|want to cancel/i;
    if (cancelPatterns.test(lowerMessage)) {
      return 'cancel_order';
    }

    // Order status patterns
    const orderPatterns = /order|track|status|delivery|shipped|package|where is my|when will|track order|order status/i;
    if (orderPatterns.test(lowerMessage)) {
      return 'order_status';
    }

    // Return policy patterns
    const returnPatterns = /return|exchange|policy|send back|give back|return policy|how to return/i;
    if (returnPatterns.test(lowerMessage)) {
      return 'return_policy';
    }

    // Refund patterns
    const refundPatterns = /refund|money back|reimburse|cancel order|get refund|request refund/i;
    if (refundPatterns.test(lowerMessage)) {
      return 'refund_request';
    }

    // Complaint patterns
    const complaintPatterns = /complaint|unhappy|disappointed|terrible|worst|horrible|problem|issue|not satisfied|bad experience/i;
    if (complaintPatterns.test(lowerMessage)) {
      return 'complaint';
    }

    return 'general_inquiry';
  }

  calculateIntentConfidence(message, intent) {
    const lowerMessage = message.toLowerCase();
    
    // Simple confidence calculation based on keyword matches
    const intents = {
      'order_status': /order|track|status|delivery/i,
      'cancel_order': /cancel/i,
      'return_policy': /return|exchange|policy/i,
      'refund_request': /refund|money back/i,
      'complaint': /complaint|unhappy|terrible/i
    };

    if (intents[intent] && intents[intent].test(lowerMessage)) {
      return 0.9;
    }

    return 0.7; // Default confidence for general inquiries
  }

  getDataSources(intent, usedAI) {
    const sources = [];

    switch (intent) {
      case 'order_status':
      case 'cancel_order':
        sources.push('Order Database');
        break;
      case 'return_policy':
        sources.push('Return Policy Database');
        break;
      case 'refund_request':
      case 'complaint':
        sources.push('Escalation Queue');
        break;
      case 'general_inquiry':
        if (usedAI) {
          if (this.gemini) {
            sources.push('Gemini API');
          } else if (this.openai) {
            sources.push('OpenAI API');
          } else {
            sources.push('Fallback Response');
          }
        }
        break;
    }

    return sources;
  }

  checkForEscalation(message, intent) {
    const lowerMessage = message.toLowerCase();
    
    // Check for high priority keywords
    const hasHighPriorityKeyword = this.highPriorityKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    // Auto-escalate refunds and complaints
    if (intent === 'refund_request' || intent === 'complaint') {
      return true;
    }

    return hasHighPriorityKeyword;
  }

  getPhoneFormats(phone) {
    // Generate multiple phone format variations to match database
    const cleaned = phone.replace(/\D/g, ''); // Remove all non-digits
    const formats = [cleaned];
    
    // If starts with country code 91, also try without it
    if (cleaned.startsWith('91') && cleaned.length > 10) {
      const without91 = cleaned.substring(2);
      formats.push(without91);
      formats.push(`+91${without91}`);
    }
    
    // Add +91 prefix variation
    if (cleaned.length === 10) {
      formats.push(`91${cleaned}`);
      formats.push(`+91${cleaned}`);
    } else if (!cleaned.startsWith('+')) {
      formats.push(`+${cleaned}`);
    }
    
    return [...new Set(formats)]; // Remove duplicates
  }

  buildPhoneSearchQuery(phoneFormats) {
    const exactClauses = phoneFormats.map((value) => ({ customerPhone: value }));

    const regexClauses = phoneFormats
      .map((value) => value.replace(/\D/g, ''))
      .filter((value) => value.length >= 10)
      .map((digits) => {
        const flexiblePattern = digits.split('').join('\\D*');
        return { customerPhone: { $regex: flexiblePattern } };
      });

    return { $or: [...exactClauses, ...regexClauses] };
  }

  matchesPhoneFormats(orderPhone, phoneFormats) {
    const orderDigits = (orderPhone || '').replace(/\D/g, '');
    const candidateDigits = phoneFormats.map((value) => value.replace(/\D/g, ''));
    return candidateDigits.includes(orderDigits);
  }

  async handleOrderStatusQuery(customerPhone, message) {
    try {
      // Extract potential order ID from message
      const requestedOrderId = this.extractOrderId(message);
      
      // Normalize phone and try multiple formats for matching
      const phoneFormats = this.getPhoneFormats(customerPhone);
      
      console.log(`🔍 Searching orders for phone formats:`, phoneFormats);
      
      // Find customer orders - try all phone formats
      const phoneQuery = this.buildPhoneSearchQuery(phoneFormats);
      const orders = await Order.find(phoneQuery)
        .sort({ orderDate: -1 })
        .limit(5);

      // If specific order ID is provided, try exact lookup first.
      if (requestedOrderId) {
        const specificOrder = await Order.findOne({ orderId: requestedOrderId });

        if (specificOrder) {
          const belongsToCustomer = this.matchesPhoneFormats(specificOrder.customerPhone, phoneFormats);

          if (!belongsToCustomer) {
            return {
              message: `I found order ${requestedOrderId}, but it is not linked to this WhatsApp number. Please use the same phone number used during checkout.`,
              orderIds: []
            };
          }

          return {
            message: this.formatOrderStatus(specificOrder),
            orderIds: [specificOrder.orderId]
          };
        }
      }

      if (orders.length === 0) {
        console.log(`❌ No orders found for phone formats:`, phoneFormats);
        return {
          message: `I couldn't find any orders associated with your phone number.\n\n📱 Your phone: ${customerPhone}\n\nPlease:\n• Make sure you're using the same number from checkout\n• Or provide your order ID (e.g., "ORD-001")\n• Or contact support if you need help`,
          orderIds: []
        };
      }

      console.log(`✅ Found ${orders.length} order(s) for customer`);

      // If specific order ID mentioned, find that order in fetched list
      if (requestedOrderId) {
        const specificOrder = orders.find(o => o.orderId.toUpperCase() === requestedOrderId);
        
        if (specificOrder) {
          return {
            message: this.formatOrderStatus(specificOrder),
            orderIds: [specificOrder.orderId]
          };
        }
      }

      // Return most recent order
      const recentOrder = orders[0];
      let response = this.formatOrderStatus(recentOrder);

      if (orders.length > 1) {
        response += `\n\n📋 You have ${orders.length} orders. Reply with a specific order number to check another order.`;
      }

      return {
        message: response,
        orderIds: [recentOrder.orderId]
      };

    } catch (error) {
      console.error('Error handling order status query:', error);
      return {
        message: "I'm having trouble retrieving your order information. Please try again in a moment or contact support with your order number.",
        orderIds: []
      };
    }
  }

  formatOrderStatus(order) {
    const statusEmoji = {
      'pending': '⏳',
      'processing': '📦',
      'shipped': '🚚',
      'delivered': '✅',
      'cancelled': '❌',
      'return_processing': '🔄',
      'returned': '↩️'
    };

    let message = `${statusEmoji[order.status] || '📦'} *Order ${order.orderId}*\n\n`;
    message += `Status: *${order.status.toUpperCase()}*\n`;
    message += `Order Date: ${order.orderDate.toLocaleDateString()}\n`;
    message += `Total: $${order.totalAmount.toFixed(2)}\n`;

    if (order.trackingNumber) {
      message += `Tracking: ${order.trackingNumber}\n`;
    }

    if (order.estimatedDelivery) {
      message += `Estimated Delivery: ${order.estimatedDelivery.toLocaleDateString()}\n`;
    }

    if (order.deliveredDate) {
      message += `Delivered: ${order.deliveredDate.toLocaleDateString()}\n`;
    }

    // Add items
    if (order.items && order.items.length > 0) {
      message += `\n📦 Items:\n`;
      order.items.forEach(item => {
        message += `• ${item.productName} (x${item.quantity})\n`;
      });
    }

    // Status-specific messages
    switch (order.status) {
      case 'processing':
        message += `\n📝 Your order is being prepared for shipment.`;
        break;
      case 'shipped':
        message += `\n🚚 Your order is on the way!`;
        break;
      case 'delivered':
        message += `\n✅ Your order has been delivered. Enjoy your purchase!`;
        break;
      case 'cancelled':
        message += `\n❌ This order was cancelled.`;
        break;
      case 'return_processing':
        message += `\n🔄 Return has been initiated and is under processing.`;
        break;
    }

    return message;
  }

  extractOrderId(message) {
    const direct = message.match(/\bORD-\d+\b/i);
    if (direct) {
      return direct[0].toUpperCase();
    }

    const contextual = message.match(/(?:order|#)\s*([A-Z0-9-]+)/i);
    if (contextual) {
      const token = contextual[1].toUpperCase();
      return token.startsWith('ORD-') ? token : null;
    }

    return null;
  }

  async handleCancelOrderRequest(customerPhone, message) {
    try {
      const phoneFormats = this.getPhoneFormats(customerPhone);
      const requestedOrderId = this.extractOrderId(message);
      const phoneQuery = this.buildPhoneSearchQuery(phoneFormats);

      let order = null;

      if (requestedOrderId) {
        order = await Order.findOne({
          orderId: requestedOrderId,
          ...phoneQuery
        });
      } else {
        order = await Order.findOne(phoneQuery)
          .sort({ orderDate: -1 });
      }

      if (!order) {
        return {
          message: `I couldn't find a cancellable order linked to your number. Please share your order ID like ORD-001.`,
          orderIds: []
        };
      }

      if (order.status === 'cancelled') {
        return {
          message: `Order ${order.orderId} is already cancelled.`,
          orderIds: [order.orderId]
        };
      }

      if (['shipped', 'delivered', 'return_processing', 'returned'].includes(order.status)) {
        return {
          message: `Order ${order.orderId} cannot be cancelled because current status is ${order.status.toUpperCase()}. You can request a return/refund instead.`,
          orderIds: [order.orderId]
        };
      }

      order.status = 'cancelled';
      order.notes = order.notes
        ? `${order.notes}\nCancelled by customer via WhatsApp chat`
        : 'Cancelled by customer via WhatsApp chat';
      await order.save();

      return {
        message: `✅ Order ${order.orderId} has been cancelled successfully. If payment was completed, refund will be processed as per policy.`,
        orderIds: [order.orderId]
      };
    } catch (error) {
      console.error('Error handling cancel order request:', error);
      return {
        message: 'I could not cancel your order right now. Please try again with your order ID or contact support.',
        orderIds: []
      };
    }
  }

  async handleReturnPolicyQuery(message) {
    try {
      // Get active return policies
      const policies = await ReturnPolicy.find({ isActive: true });

      if (policies.length === 0) {
        return "Our standard return policy allows returns within 30 days of delivery. Items must be unused and in original packaging. Please contact support for specific return requests.";
      }

      // Get general policy
      const generalPolicy = policies.find(p => p.category === 'general') || policies[0];

      let response = `📋 *Return Policy*\n\n`;
      response += `${generalPolicy.content}\n\n`;

      if (generalPolicy.timeFrame) {
        response += `⏰ Return Window: ${generalPolicy.timeFrame.value} ${generalPolicy.timeFrame.unit}\n\n`;
      }

      if (generalPolicy.conditions && generalPolicy.conditions.length > 0) {
        response += `✓ Conditions:\n`;
        generalPolicy.conditions.forEach(condition => {
          response += `  • ${condition}\n`;
        });
      }

      response += `\n💡 To process a return, please reply with "I want to return order [ORDER_ID]" and I'll help you get started.`;

      return response;

    } catch (error) {
      console.error('Error handling return policy query:', error);
      return "Our return policy allows returns within 30 days of delivery. Items must be unused and in original packaging. For specific return requests, please contact our support team.";
    }
  }

  async handleRefundRequest(customerPhone, customerName, message) {
    try {
      const phoneFormats = this.getPhoneFormats(customerPhone);
      const phoneQuery = this.buildPhoneSearchQuery(phoneFormats);

      // Find recent orders
      const orders = await Order.find(phoneQuery)
        .sort({ orderDate: -1 })
        .limit(5);

      // Extract order ID if mentioned
      const orderIdMatch = message.match(/(?:order|#)\s*([A-Z0-9-]+)/i);
      let orderIds = [];

      if (orderIdMatch && orders.length > 0) {
        const requestedOrderId = orderIdMatch[1].toUpperCase();
        const order = orders.find(o => o.orderId.toUpperCase().includes(requestedOrderId));
        if (order) {
          orderIds = [order.orderId];
        }
      }

      const response = `🔔 *Refund Request Received*\n\n` +
        `I understand you'd like to request a refund. I've escalated your request to our customer service team who will review your case and contact you within 24 hours.\n\n` +
        `📞 For urgent matters, please call our support line.\n\n` +
        `Reference: Your conversation has been logged and a support agent will reach out soon.`;

      return { message: response, orderIds };

    } catch (error) {
      console.error('Error handling refund request:', error);
      return {
        message: "I've noted your refund request and escalated it to our support team. They will contact you within 24 hours.",
        orderIds: []
      };
    }
  }

  async handleComplaint(customerPhone, customerName, message) {
    const response = `🔔 *Complaint Registered*\n\n` +
      `I sincerely apologize for your experience. Your feedback is very important to us.\n\n` +
      `I've immediately escalated your concern to our management team. A senior representative will contact you within 4 hours to address your concerns.\n\n` +
      `We appreciate your patience and the opportunity to make this right.`;

    return response;
  }

  async handleEscalation(customerPhone, customerName, message, reason) {
    const response = `🔔 *Priority Support*\n\n` +
      `I've escalated your request to our priority support team. A representative will contact you shortly to assist you personally.\n\n` +
      `Thank you for your patience.`;

    return response;
  }

  async handleGeneralInquiry(message, customerName, recentMessages = [], adminId = null) {
    const tokenUsageZero = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };

    // 1) Knowledge base first: fastest response and no model spend.
    try {
      if (adminId) {
        const kbResult = await knowledgeBaseService.queryKnowledgeBase(message, adminId);

        if (kbResult.foundInKB && kbResult.confidence > 0.5) {
          const responsePlan = this.buildResponsePlan(kbResult.answer);

          return {
            message: kbResult.answer,
            usedAI: false,
            model: 'KnowledgeBase',
            modelUsed: 'KnowledgeBase',
            tokenUsage: tokenUsageZero,
            aiLogPayload: {
              systemPrompt: 'Knowledge Base Query (RAG)',
              userPrompt: this.buildContextualPrompt({ customerName, message, recentMessages }),
              aiResponse: kbResult.answer,
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              temperature: 0.3
            },
            responseParts: responsePlan.responseParts,
            typingDelayMs: responsePlan.typingDelayMs,
            cacheable: true
          };
        }
      } else {
        const knowledgeBases = await KnowledgeBase.find({ isActive: true });

        if (knowledgeBases.length > 0) {
          const texts = knowledgeBases.map((kb) => kb.extractedText);
          const kbResult = await knowledgeBaseService.queryKnowledgeBase(message, texts);

          if (kbResult.foundInKB && kbResult.confidence > 0.5) {
            const responsePlan = this.buildResponsePlan(kbResult.answer);

            return {
              message: kbResult.answer,
              usedAI: false,
              model: 'KnowledgeBase',
              modelUsed: 'KnowledgeBase',
              tokenUsage: tokenUsageZero,
              aiLogPayload: {
                systemPrompt: 'Knowledge Base Query (Full Text Fallback)',
                userPrompt: this.buildContextualPrompt({ customerName, message, recentMessages }),
                aiResponse: kbResult.answer,
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                temperature: 0.3
              },
              responseParts: responsePlan.responseParts,
              typingDelayMs: responsePlan.typingDelayMs,
              cacheable: true
            };
          }
        }
      }
    } catch (error) {
      console.error('Error querying knowledge base first:', error);
      // Fall through to Gemini/OpenAI if KB lookup fails.
    }

    const systemInstruction = this.buildSystemInstruction(customerName);
    const systemPrompt = systemInstruction;
    const userPrompt = this.buildContextualPrompt({ customerName, message, recentMessages });

    // 2) Gemini preferred model for low-cost AI answers.
    if (this.gemini) {
      try {
        const modelClient = this.gemini.getGenerativeModel({
          model: this.geminiModelName,
          systemInstruction,
          generationConfig: {
            temperature: 0.6,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: this.maxOutputTokens
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE'
            }
          ]
        });

        const result = await modelClient.generateContent(userPrompt);

        if (result.response.promptFeedback?.blockReason) {
          console.warn('Gemini blocked response:', result.response.promptFeedback.blockReason);
          throw new Error(`Content blocked: ${result.response.promptFeedback.blockReason}`);
        }

        const aiResponse = result.response.text();
        const responsePlan = this.buildResponsePlan(aiResponse);

        const tokenUsage = {
          promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
          completionTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: result.response.usageMetadata?.totalTokenCount || 0
        };

        console.log(`AI MODEL | Gemini | tokens=${tokenUsage.totalTokens} | prompt=${tokenUsage.promptTokens} | completion=${tokenUsage.completionTokens}`);

        return {
          message: aiResponse,
          usedAI: true,
          model: this.geminiModelName,
          modelUsed: 'Gemini',
          tokenUsage,
          aiLogPayload: {
            systemPrompt,
            userPrompt,
            aiResponse,
            promptTokens: tokenUsage.promptTokens,
            completionTokens: tokenUsage.completionTokens,
            totalTokens: tokenUsage.totalTokens,
            temperature: 0.6
          },
          responseParts: responsePlan.responseParts,
          typingDelayMs: responsePlan.typingDelayMs,
          cacheable: true
        };
      } catch (error) {
        console.error('Gemini API error:', error.message);

        if (error.message.includes('blocked') || error.message.includes('SAFETY')) {
          const fallbackMessage = `Hi ${customerName}! I'm here to help with your order questions. Could you please rephrase your message or let me know your order number?`;
          const responsePlan = this.buildResponsePlan(fallbackMessage);

          return {
            message: fallbackMessage,
            usedAI: false,
            model: null,
            modelUsed: 'Fallback',
            tokenUsage: tokenUsageZero,
            aiLogPayload: {
              systemPrompt,
              userPrompt,
              aiResponse: fallbackMessage,
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0,
              temperature: 0.6
            },
            responseParts: responsePlan.responseParts,
            typingDelayMs: responsePlan.typingDelayMs,
            cacheable: true
          };
        }
        // Continue to OpenAI fallback if Gemini fails.
      }
    }

    // 3) OpenAI fallback for resilience when Gemini is unavailable or fails.
    if (this.openai) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: this.openaiModelName,
          messages: [
            {
              role: 'system',
              content: systemInstruction
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          max_tokens: this.maxOutputTokens,
          temperature: 0.6
        });

        const aiResponse = completion.choices[0].message.content;
        const responsePlan = this.buildResponsePlan(aiResponse);
        const tokenUsage = {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        };

        console.log(`AI MODEL | OpenAI | tokens=${tokenUsage.totalTokens} | prompt=${tokenUsage.promptTokens} | completion=${tokenUsage.completionTokens}`);

        return {
          message: aiResponse,
          usedAI: true,
          model: this.openaiModelName,
          modelUsed: 'OpenAI',
          tokenUsage,
          aiLogPayload: {
            systemPrompt,
            userPrompt,
            aiResponse,
            promptTokens: tokenUsage.promptTokens,
            completionTokens: tokenUsage.completionTokens,
            totalTokens: tokenUsage.totalTokens,
            temperature: 0.6
          },
          responseParts: responsePlan.responseParts,
          typingDelayMs: responsePlan.typingDelayMs,
          cacheable: true
        };
      } catch (error) {
        console.error('OpenAI API error:', error);
      }
    }

    // 4) Static fallback message if both model providers are unavailable or fail.
    const fallbackMessage = `Hi ${customerName}! 👋\n\nI'm here to help with:\n` +
      `📦 Order status and tracking\n` +
      `↩️ Returns and exchanges\n` +
      `💰 Refund requests\n` +
      `❓ General questions\n\n` +
      `How can I assist you today?`;
    const responsePlan = this.buildResponsePlan(fallbackMessage);

    return {
      message: fallbackMessage,
      usedAI: false,
      model: null,
      modelUsed: 'Fallback',
      tokenUsage: tokenUsageZero,
      aiLogPayload: {
        systemPrompt,
        userPrompt,
        aiResponse: fallbackMessage,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        temperature: 0.6
      },
      responseParts: responsePlan.responseParts,
      typingDelayMs: responsePlan.typingDelayMs,
      cacheable: true
    };
  }

  async createEscalation({ customerPhone, customerName, message, reason, relatedOrderIds }) {
    try {
      // Find the active conversation
      const conversation = await Conversation.findOne({
        customerPhone,
        status: { $in: ['active', 'escalated'] }
      });

      if (!conversation) {
        console.error('No active conversation found for escalation');
        return;
      }

      // Determine priority based on reason
      let priority = 'medium';
      if (reason === 'refund_request' || reason === 'complaint') {
        priority = 'high';
      } else if (reason === 'high_priority') {
        priority = 'urgent';
      }

      // Create escalation
      const escalation = new Escalation({
        conversationId: conversation._id,
        customerPhone,
        customerName,
        reason,
        priority,
        description: message,
        relatedOrderIds: relatedOrderIds || [],
        status: 'pending',
        admin: conversation.admin
      });

      await escalation.save();
      console.log(`🚨 Escalation created: ${escalation._id} (Priority: ${priority})`);

      // Send notification (implement email/SMS service here)
      await this.notifySupport(escalation);

    } catch (error) {
      console.error('Error creating escalation:', error);
    }
  }

  async notifySupport(escalation) {
    console.log(`📧 Support notification triggering for escalation ${escalation._id}...`);
    console.log(`   Customer: ${escalation.customerName} (${escalation.customerPhone})`);
    console.log(`   Reason: ${escalation.reason}`);
    console.log(`   Priority: ${escalation.priority}`);
    
    try {
      const nodemailer = require('nodemailer');
      
      // Get Admin User details
      let recipientEmail = process.env.ESCALATION_EMAIL || process.env.ADMIN_EMAIL || 'support@store.com';
      let adminName = 'Store Administrator';

      if (escalation.admin) {
        const Admin = require('../models/Admin');
        const adminDoc = await Admin.findById(escalation.admin);
        if (adminDoc && adminDoc.email) {
          recipientEmail = adminDoc.email;
          adminName = adminDoc.name || 'Store Administrator';
        }
      }

      // Configure email transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
            .content { padding: 40px; }
            .content h2 { color: #1f2937; font-size: 20px; margin-bottom: 16px; }
            .content p { color: #4b5563; line-height: 1.6; margin-bottom: 16px; }
            .details { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0; }
            .details-row { display: flex; border-bottom: 1px solid #f3f4f6; padding: 10px 0; }
            .details-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #4b5563; width: 150px; }
            .value { color: #1f2937; flex: 1; }
            .priority-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .priority-urgent { background: #fee2e2; color: #ef4444; }
            .priority-high { background: #ffedd5; color: #f97316; }
            .priority-medium { background: #fef9c3; color: #ca8a04; }
            .priority-low { background: #f0fdf4; color: #22c55e; }
            .button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; text-align: center; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚨 WhatsApp Chat Escalation Alert!</h1>
            </div>
            <div class="content">
              <h2>Hello ${adminName},</h2>
              <p>An ongoing customer conversation has been escalated to manual support. The AI response helper has been paused, and the customer is waiting for a response.</p>
              
              <div class="details">
                <div class="details-row">
                  <div class="label">Customer Name</div>
                  <div class="value">${escalation.customerName}</div>
                </div>
                <div class="details-row">
                  <div class="label">Phone Number</div>
                  <div class="value">${escalation.customerPhone}</div>
                </div>
                <div class="details-row">
                  <div class="label">Reason</div>
                  <div class="value"><strong>${escalation.reason}</strong></div>
                </div>
                <div class="details-row">
                  <div class="label">Priority</div>
                  <div class="value">
                    <span class="priority-badge priority-${escalation.priority}">${escalation.priority}</span>
                  </div>
                </div>
                <div class="details-row">
                  <div class="label">Escalated At</div>
                  <div class="value">${new Date().toLocaleString('en-IN')}</div>
                </div>
                <div class="details-row">
                  <div class="label">Trigger Message</div>
                  <div class="value">"${escalation.description}"</div>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/live-chat" class="button" style="color: white !important;">Take Over Conversation</a>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} WhatsApp Support Bot. All rights reserved.</p>
              <p>This is an automated system notification.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your_email@gmail.com') {
        await transporter.sendMail({
          from: `"WhatsApp Support Bot" <${process.env.SMTP_USER}>`,
          to: recipientEmail,
          subject: `🚨 [Escalation Alert] Customer ${escalation.customerName} requests assistance (${escalation.priority.toUpperCase()})`,
          html: emailHtml
        });
        console.log(`✅ Escalation email sent to ${recipientEmail}`);
      } else {
        console.log(`⚠️ SMTP credentials not configured. Skipping email delivery for ${recipientEmail}.`);
      }

      // Emit socket event to frontend so admin UI highlights this escalated conversation
      const io = global.io;
      if (io) {
        io.emit('new_message', {
          customerPhone: escalation.customerPhone,
          escalated: true,
          status: 'escalated'
        });
        io.emit('escalation_created', escalation);
      }

      // Mark notification as sent
      escalation.notificationSent = true;
      await escalation.save();
    } catch (error) {
      console.error('❌ Error sending support notification email:', error);
    }
  }

  async analyzeWithGemini(prompt, history = []) {
    // Try Gemini first
    if (this.gemini) {
      try {
        const model = this.gemini.getGenerativeModel({
          model: this.geminiModelName || 'gemini-2.5-flash',
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          }
        });
        
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        console.error('Error generating content with Gemini:', error);
      }
    }
    
    // Fallback to OpenAI if configured
    if (this.openai) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: this.openaiModelName || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        });
        return completion.choices[0].message.content;
      } catch (error) {
        console.error('Error generating content with OpenAI fallback:', error);
      }
    }

    // Default static JSON fallback if no AI is available/configured
    console.warn('⚠️ No AI provider available for analyzeWithGemini. Returning mock response.');
    return JSON.stringify({
      sentiment: 'neutral',
      confidence: 0.8,
      breakdown: {
        happy: 60,
        neutral: 30,
        frustrated: 10
      },
      reasoning: 'Analyzed using local mock analysis.'
    });
  }
}

// Create singleton instance
const aiService = new AIService();

module.exports = aiService;

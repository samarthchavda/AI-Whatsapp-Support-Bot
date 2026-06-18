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
const emailService = require('./emailService');
const knowledgeBaseService = require('./knowledgeBaseService');
const subscriptionService = require('./subscriptionService');

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

  buildContextualPrompt({ customerName, message, recentMessages, kbContext = null }) {
    const contextLines = recentMessages.length > 0
      ? recentMessages.map((entry, index) => {
          return `${index + 1}. ${entry.role}: ${entry.content}`;
        }).join('\n')
      : 'No prior conversation context.';

    const parts = [
      `Customer: ${customerName}`,
      `Recent context:\n${contextLines}`
    ];

    if (kbContext) {
      parts.push(`Reference Information from Knowledge Base:\n${kbContext}`);
    }

    parts.push(`Current message: ${message}`);
    parts.push('Reply in a concise, helpful WhatsApp-friendly style. Do not invent order or policy details.');

    return parts.join('\n\n');
  }

  buildSystemInstruction(customerName, storeInfo = {}) {
    const storeName = storeInfo.businessName || 'our store';
    const storeUrl = storeInfo.storeUrl || null;
    const supportEmail = storeInfo.supportEmail || null;

    const storeContext = [];
    if (storeInfo.businessName) storeContext.push(`Store Name: ${storeInfo.businessName}`);
    if (storeUrl) storeContext.push(`Store Website: ${storeUrl}`);
    if (supportEmail) storeContext.push(`Support Email: ${supportEmail}`);

    const storeSection = storeContext.length > 0
      ? `\nStore Information:\n${storeContext.join('\n')}\n`
      : '';

    const urlHint = storeUrl
      ? ` Visit ${storeUrl} for more details.`
      : '';

    return `You are a professional customer support agent for ${storeName}.
${storeSection}
Rules:
1. Never repeat the document title.
2. Never mention page numbers.
3. Never copy raw knowledge base text.
4. Answer the customer's question directly.
5. Rewrite the information in natural conversational language.
6. Include only information relevant to the user's question.
7. Keep responses clear, professional, and customer-friendly. Avoid overly brief, one-sentence, or robotic replies. Provide complete and helpful explanations.
8. If the answer is Yes or No, start with Yes or No.
9. Do not mention internal documents, guides, PDFs, pages, or sources.
10. Use the recent conversation context.
11. Never invent order, refund, or policy details.
12. Escalate refunds and complaints when appropriate.
13. Address the customer naturally: ${customerName}.
14. Use only information relevant to the user's question and ignore unrelated retrieved content.
15. When answering about STORE DETAILS or PRODUCTS, always include the store website URL if available.
16. If a customer is asking about cancellations, complaints, or refunds, and you cannot perform the action yourself, politely explain that the system will guide them or escalate to a human agent, and provide a helpful, full sentence explanation of what they should do next.

Smart Fallback Rules (when specific information is not available in the knowledge base):
- If a customer asks about OFFERS or DISCOUNTS and no info is available: Reply with "We don't have any active offers right now, but stay tuned! We'll notify you as soon as a new offer drops. 🎉${urlHint}"
- If a customer asks about STORE DETAILS and no info is available: Reply with "Welcome to ${storeName}! We're committed to providing you the best products and service.${urlHint} Feel free to ask me anything specific! 🛍️"
- If a customer asks about PRODUCTS and no info is available: Reply with "We have a great range of products!${storeUrl ? ` Browse our full catalog at ${storeUrl}` : ' Visit our store website to explore the full catalog'}, or tell me what you're looking for and I'll help. 😊"
- If a customer asks about DELIVERY TIME and no info is available: Reply with "Delivery typically takes 3-7 business days depending on your location. For exact delivery info on your order, please share your order number."
- If a customer asks about PAYMENT METHODS and no info is available: Reply with "We accept all major payment methods including UPI, credit/debit cards, and net banking. For specific payment queries, feel free to ask!"
- If a customer says HI, HELLO, or a GREETING: Reply warmly with "Hey ${customerName}! 👋 Welcome to ${storeName}! How can I help you today?" Do NOT escalate greetings.
- If a customer asks WHO ARE YOU or WHAT DO YOU DO: Reply with "I'm your AI shopping assistant for ${storeName}! I can help with order tracking, product info, store policies, and more. Just ask! 🤖"
- ONLY escalate to a human agent for REFUNDS, COMPLAINTS, or genuinely complex issues that cannot be answered. Do NOT escalate for simple questions.`;
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

  async processMessage({ customerPhone, customerName, message, messageId, adminId = null }) {
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

      // Get or create conversation for logging, scoped by admin/tenant if available
      const conversationQuery = {
        customerPhone,
        status: { $in: ['active', 'escalated'] }
      };
      if (adminId) {
        conversationQuery.admin = adminId;
      }

      conversation = await Conversation.findOne(conversationQuery);

      if (!conversation) {
        let finalAdminId = adminId;
        if (!finalAdminId) {
          let adminDoc = await Admin.findOne({ whatsappConnected: true, email: { $ne: 'demo@store.com' } })
            || await Admin.findOne({ whatsappConnected: true })
            || await Admin.findOne({ email: 'demo@store.com' })
            || await Admin.findOne();
          finalAdminId = adminDoc ? adminDoc._id : null;
        }

        conversation = new Conversation({
          admin: finalAdminId,
          customerPhone,
          customerName,
          messages: [],
          status: 'active'
        });
        await conversation.save();
      }

      // Check if message is a product inquiry
      try {
        const productName = await this.detectProductInquiry(message, conversation.admin);
        if (productName) {
          conversation.hasProductInquiry = true;
          conversation.inquiredProductName = productName;
          conversation.productInquiryAt = new Date();
          conversation.followUpSent = false;
        }
      } catch (inquiryErr) {
        console.error('Error running product inquiry detection:', inquiryErr);
      }

      // Retrieve Admin document
      let adminDoc = null;
      if (conversation.admin) {
        adminDoc = await Admin.findById(conversation.admin);
      }
      if (!adminDoc) {
        adminDoc = await Admin.findOne({ whatsappConnected: true, email: { $ne: 'demo@store.com' } })
          || await Admin.findOne({ whatsappConnected: true })
          || await Admin.findOne({ email: 'demo@store.com' })
          || await Admin.findOne();
      }

      // Detect language and translate if foreign
      let detectedLanguage = 'English';
      let translation = null;
      try {
        const translationService = require('./translationService');
        const translationResult = await translationService.detectAndTranslate(message);
        detectedLanguage = translationResult.detectedLanguage;
        translation = translationResult.translation;
      } catch (err) {
        console.error('Failed to run translation service:', err);
      }

      // Check subscription active, token limit checks, and WhatsApp connection status
      if (adminDoc) {
        // Check if WhatsApp channel is disconnected
        const isWhatsappDisconnected = adminDoc.whatsappConnected === false;
        if (isWhatsappDisconnected) {
          console.log(`🔕 WhatsApp channel disconnected for tenant: ${adminDoc.email}. Skipping AI response.`);
          
          const currentIntent = this.detectIntent(message);
          conversation.messages = conversation.messages || [];
          conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
            intent: currentIntent,
            messageId,
            detectedLanguage,
            translation
          });
          conversation.updatedAt = new Date();
          await conversation.save();

          if (global.io) {
            global.io.emit('new_message', {
              customerPhone,
              role: 'user',
              content: message,
              timestamp: new Date(),
              intent: currentIntent,
              detectedLanguage,
              translation
            });
          }

          return {
            botPaused: true,
            whatsappDisconnected: true,
            message: "I apologize, but this store's WhatsApp connection is currently disconnected.",
            intent: currentIntent,
            escalated: conversation.escalated || conversation.status === 'escalated',
            escalationReason: conversation.escalationReason,
            relatedOrderIds: conversation.relatedOrderIds || [],
            structuredOutput: {
              intent: currentIntent,
              metadata: {
                responseTime: Date.now() - startTime,
                usedAI: false,
                whatsappDisconnected: true
              }
            },
            responseParts: [],
            typingDelayMs: 0
          };
        }

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
            messageId,
            detectedLanguage,
            translation
          });
          conversation.updatedAt = new Date();
          await conversation.save();

          if (global.io) {
            global.io.emit('new_message', {
              customerPhone,
              role: 'user',
              content: message,
              timestamp: new Date(),
              intent: currentIntent,
              detectedLanguage,
              translation
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

        const limitCheck = subscriptionService.checkLimitExceeded(adminDoc);
        if (limitCheck.exceeded) {
          console.warn(`⚠️ [LIMIT BREACH] Monthly limit exceeded for tenant ${adminDoc.email}: ${limitCheck.reason}`);
          
          // Send notification to merchant's WhatsApp (only once per billing cycle)
          if (adminDoc.businessPhone && !adminDoc.limitNotificationSent) {
            try {
              let customCredentials = null;
              if (adminDoc.whatsappAccessToken && adminDoc.whatsappPhoneNumberId) {
                customCredentials = {
                  accessToken: adminDoc.whatsappAccessToken,
                  phoneNumberId: adminDoc.whatsappPhoneNumberId,
                  businessAccountId: adminDoc.whatsappBusinessAccountId
                };
              }
              const notificationMessage = `Support system notification: Your monthly AI support limits have been reached. Please contact your administrator or upgrade your plan to resume automation.`;
              
              if (adminDoc.webBotEnabled) {
                const whatsappWebBot = require('./whatsappWebBot');
                if (whatsappWebBot.client && whatsappWebBot.isReady) {
                  const formattedPhone = adminDoc.businessPhone.replace(/\D/g, '') + '@c.us';
                  await whatsappWebBot.client.sendMessage(formattedPhone, notificationMessage);
                  console.log(`✉️ Limit notification sent to merchant via Web Bot (${formattedPhone})`);
                }
              } else {
                const whatsappCloudAPI = require('./whatsappCloudAPI');
                await whatsappCloudAPI.sendMessage(adminDoc.businessPhone, notificationMessage, customCredentials);
                console.log(`✉️ Limit notification sent to merchant via Cloud API (${adminDoc.businessPhone})`);
              }
              
              adminDoc.limitNotificationSent = true;
              await adminDoc.save();
            } catch (notifyErr) {
              console.error('Failed to send limit notification to merchant:', notifyErr);
            }
          }

          const currentIntent = this.detectIntent(message);
          conversation.messages = conversation.messages || [];
          conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
            intent: currentIntent,
            messageId,
            detectedLanguage,
            translation
          });
          conversation.updatedAt = new Date();
          await conversation.save();

          if (global.io) {
            global.io.emit('new_message', {
              customerPhone,
              role: 'user',
              content: message,
              timestamp: new Date(),
              intent: currentIntent,
              detectedLanguage,
              translation
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

      // Self-healing: If conversation is marked escalated, check if there are any open/active escalations
      if (conversation.escalated || conversation.status === 'escalated') {
        const Escalation = require('../models/Escalation');
        const activeEscalation = await Escalation.findOne({
          conversationId: conversation._id,
          status: { $in: ['pending', 'in_progress'] }
        });
        if (!activeEscalation) {
          console.log(`🔧 Self-healing: No active escalations found for escalated conversation ${customerPhone}. Unpausing bot.`);
          conversation.status = 'active';
          conversation.escalated = false;
          conversation.botPaused = false;
          await conversation.save();
        }
      }

      // If the conversation is paused or escalated, skip AI generation and save the message
      // Exception: If we are in AI Draft Mode, we want to allow generating a suggested reply draft even if botPaused is true.
      // const isPausedInDraftMode = conversation.botPaused && adminDoc && adminDoc.aiDraftMode === true;
      const isPausedInDraftMode = false; // Temporarily disabled as per user request
      if (conversation.escalated || conversation.status === 'escalated' || (conversation.botPaused && !isPausedInDraftMode)) {
        console.log(`🔕 Bot is PAUSED/ESCALATED for ${customerPhone}. Skipping AI response generation.`);
        
        const currentIntent = this.detectIntent(message);
        
        conversation.messages = conversation.messages || [];
        conversation.messages.push({
          role: 'user',
          content: message,
          timestamp: new Date(),
          intent: currentIntent,
          messageId,
          detectedLanguage,
          translation
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
            intent: currentIntent,
            detectedLanguage,
            translation
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
        case 'new_order_inquiry':
          response = await this.handleNewOrderInquiry(adminDoc);
          break;

        case 'order_status':
          const orderResult = await this.handleOrderStatusQuery(customerPhone, message, adminDoc ? adminDoc._id : null);
          response = orderResult.message;
          relatedOrderIds = orderResult.orderIds || [];
          break;

        case 'cancel_order':
          const cancelResult = await this.handleCancelOrderRequest(customerPhone, message, adminDoc ? adminDoc._id : null);
          response = cancelResult.message;
          relatedOrderIds = cancelResult.orderIds || [];
          break;

        case 'return_policy':
          const policyText = await this.handleReturnPolicyQuery(message, adminDoc ? adminDoc._id : null);
          const recentMsgList = this.getRecentConversationMessages(conversation, this.maxRecentMessages);
          const returnAiResult = await this.handleGeneralInquiry(message, customerName, recentMsgList, conversation.admin, policyText);
          response = returnAiResult.message;
          usedAI = returnAiResult.usedAI;
          aiModel = returnAiResult.model || null;
          modelUsed = returnAiResult.modelUsed || (returnAiResult.usedAI ? 'AI' : 'Fallback');
          tokenUsage = returnAiResult.tokenUsage || tokenUsage;
          typingDelayMs = returnAiResult.typingDelayMs || 0;
          responseParts = returnAiResult.responseParts || [];
          break;

        case 'refund_request':
          const refundResult = await this.handleRefundRequest(customerPhone, customerName, message, adminDoc ? adminDoc._id : null);
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
        messageId,
        detectedLanguage,
        translation
      });

      // const isDraftMode = adminDoc && adminDoc.aiDraftMode === true;
      const isDraftMode = false; // Temporarily disabled as per user request

      if (isDraftMode) {
        conversation.suggestedReply = response;
        conversation.botPaused = true;
      } else {
        conversation.messages.push({
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          intent
        });
      }

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

      // Emit socket event in draft mode so live chat gets notified instantly of user msg + new draft
      if (isDraftMode && global.io) {
        global.io.emit('new_message', {
          customerPhone,
          role: 'user',
          content: message,
          timestamp: new Date(),
          intent,
          botPaused: true,
          suggestedReply: response
        });
      } else if (!isDraftMode && global.io) {
        // Emit in non-draft mode so live chat and dashboard sync in real-time
        global.io.emit('new_message', {
          customerPhone,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          intent,
          status: conversation.status
        });
      }

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

      // Determine if we should attach interactive buttons
      let buttons = [];
      const lowerMsg = message.toLowerCase().trim();
      const greetings = ['hi', 'hello', 'hey', 'yo', 'hola', 'namaste', 'help', 'menu', 'options', 'support', 'start'];
      const isGreeting = greetings.includes(lowerMsg) || lowerMsg.length <= 4;
      const isNewConversation = conversation && conversation.messages && conversation.messages.filter(m => m.role === 'assistant').length === 0;

      if ((isGreeting || isNewConversation) && !escalated && intent === 'general_inquiry') {
        buttons = ['Check Order Status', 'Talk to Agent', 'Store FAQs'];
      }

      return {
        message: response,
        intent,
        escalated,
        escalationReason,
        relatedOrderIds,
        structuredOutput,
        responseParts,
        typingDelayMs,
        buttons: buttons.length > 0 ? buttons : undefined,
        botPaused: false,
        aiDraftMode: false
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

  async detectProductInquiry(message, adminId) {
    let knownProducts = [];
    try {
      if (adminId) {
        knownProducts = await Order.distinct('items.productName', { admin: adminId });
      }
    } catch (err) {
      console.error('Error fetching distinct products:', err);
    }

    if (this.gemini) {
      const prompt = `Analyze this customer message to see if they are asking a question or inquiring about a specific product name (e.g. price, features, stock status, options, size, color, description, etc.).
Customer message: "${message}"
Store products hint list: ${JSON.stringify(knownProducts)}

If the customer is asking about a product (either one from the hint list or any other product), return the exact name of the product they are asking about.
If they are NOT asking about a product (e.g. greeting, order cancellation, generic help, order tracking, shipping policy, returns, etc.), return "NONE".

Response format must be ONLY the product name or "NONE". Do not write any other explanation or text.`;

      try {
        const model = this.gemini.getGenerativeModel({ model: this.geminiModelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().replace(/['"“”]/g, '');
        
        if (text && text.toUpperCase() !== 'NONE') {
          return text;
        }
      } catch (err) {
        console.error('Error in detectProductInquiry LLM call:', err);
      }
    }

    const lowerMessage = message.toLowerCase();
    for (const p of knownProducts) {
      if (p && p.length > 2 && lowerMessage.includes(p.toLowerCase())) {
        return p;
      }
    }
    
    return null;
  }

  detectIntent(message) {
    const lowerMessage = message.toLowerCase();

    // Direct order ID lookup (e.g., ORD-013)
    if (/^\s*ord-\d+\s*$/i.test(lowerMessage)) {
      return 'order_status';
    }

    // Cancel order patterns (exclude policy inquiries)
    const cancelPatterns = /cancel|cancle|cacel|cancell|cancelling|canceling/i;
    if (cancelPatterns.test(lowerMessage) && !/policy|policies|polices|rule|rules/i.test(lowerMessage)) {
      return 'cancel_order';
    }

    // Return policy patterns (highest priority for policy/rules terms)
    const returnPatterns = /return|exchange|policy|policies|polices|rule|rules|send back|give back|return policy|how to return/i;
    if (returnPatterns.test(lowerMessage)) {
      return 'return_policy';
    }

    // Refund patterns (exclude policy inquiries)
    const refundPatterns = /refund|money back|reimburse|get refund|request refund/i;
    if (refundPatterns.test(lowerMessage) && !/policy|policies|polices|rule|rules/i.test(lowerMessage)) {
      return 'refund_request';
    }

    // New order/purchase patterns (e.g., "new order", "place order", "want to buy", "how to order")
    const newOrderKeywords = [
      'new order',
      'place order',
      'place an order',
      'place a new order',
      'want to buy',
      'want to order',
      'can i order',
      'can you take order',
      'can you take my order',
      'how to buy',
      'how to order',
      'order online',
      'buy now',
      'shop now',
      'create order',
      'create new order'
    ];
    const isNewOrder = (newOrderKeywords.some(kw => lowerMessage.includes(kw)) ||
                       (/\b(buy|order|purchase)\b/i.test(lowerMessage) && /\b(new|take|place|make|want to|how to|web|link|online)\b/i.test(lowerMessage))) &&
                       !/\b(status|track|check|where|when|shipped|delivered|cancel|return|refund)\b/i.test(lowerMessage);
    if (isNewOrder) {
      return 'new_order_inquiry';
    }

    // Order status patterns
    const orderPatterns = /order|track|status|delivery|shipped|package|where is my|when will|track order|order status/i;
    if (orderPatterns.test(lowerMessage)) {
      return 'order_status';
    }

    // Complaint patterns
    const complaintPatterns = /complaint|complain|complent|complate|unhappy|disappointed|terrible|worst|horrible|problem|issue|not satisfied|bad experience|bad service|against you|aginst you|sue you|report you/i;
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
      'cancel_order': /cancel|cancle|cacel|cancell/i,
      'return_policy': /return|exchange|policy|policies|polices/i,
      'refund_request': /refund|money back|reimburse/i,
      'complaint': /complaint|complain|complent|complate|unhappy|terrible/i
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

  async handleOrderStatusQuery(customerPhone, message, adminId = null) {
    try {
      const Integration = require('../models/Integration');
      
      // Detect if store is Shopify Basic (using placeholder phone numbers)
      let isShopifyBasic = false;
      if (adminId) {
        const shopifyIntegration = await Integration.findOne({ adminId, platform: 'shopify', isActive: true });
        if (shopifyIntegration) {
          const redactedOrderExists = await Order.findOne({ admin: adminId, customerPhone: /^shopify-order-/ });
          if (redactedOrderExists) {
            isShopifyBasic = true;
          }
        }
      }

      // Extract potential order ID from message
      const requestedOrderId = this.extractOrderId(message);

      // If it's a Shopify Basic store, enforce ONLY Order Number lookup
      if (isShopifyBasic) {
        if (!requestedOrderId) {
          return {
            message: `I couldn't find any orders automatically because customer contact details are restricted on this store. 🛒\n\nPlease reply with your **Order Number** (e.g. #1008) so I can fetch your status!`,
            orderIds: []
          };
        }

        const specificOrder = await Order.findOne({
          admin: adminId,
          $or: [
            { orderId: requestedOrderId },
            { externalOrderId: requestedOrderId },
            { externalOrderNumber: requestedOrderId },
            { externalOrderNumber: `#${requestedOrderId}` }
          ]
        });

        if (!specificOrder) {
          return {
            message: `I couldn't find any order matching **${requestedOrderId}**. Please make sure the order number is correct (e.g. #1008) and try again.`,
            orderIds: []
          };
        }

        return {
          message: await this.formatOrderStatus(specificOrder),
          orderIds: [specificOrder.orderId]
        };
      }
      
      // Normalize phone and try multiple formats for matching
      const phoneFormats = this.getPhoneFormats(customerPhone);
      
      console.log(`🔍 Searching orders for phone formats under admin ${adminId}:`, phoneFormats);
      
      // Find customer orders - try all phone formats and isolate by adminId
      const phoneQuery = this.buildPhoneSearchQuery(phoneFormats);
      const orders = await Order.find({
        ...phoneQuery,
        admin: adminId
      })
        .sort({ orderDate: -1 })
        .limit(5);

      // If specific order ID is provided, try exact lookup first.
      if (requestedOrderId) {
        const specificOrder = await Order.findOne({
          admin: adminId,
          $or: [
            { orderId: requestedOrderId },
            { externalOrderId: requestedOrderId },
            { externalOrderNumber: requestedOrderId },
            { externalOrderNumber: `#${requestedOrderId}` }
          ]
        });

        if (specificOrder) {
          // Bypass phone check if order phone is a shopify placeholder
          const isPlaceholderPhone = specificOrder.customerPhone && specificOrder.customerPhone.startsWith('shopify-order-');
          const belongsToCustomer = isPlaceholderPhone || this.matchesPhoneFormats(specificOrder.customerPhone, phoneFormats);

          if (!belongsToCustomer) {
            return {
              message: `I found order ${requestedOrderId}, but it is not linked to this WhatsApp number. Please use the same phone number used during checkout.`,
              orderIds: []
            };
          }

          return {
            message: await this.formatOrderStatus(specificOrder),
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
        const specificOrder = orders.find(o => 
          o.orderId.toUpperCase() === requestedOrderId || 
          (o.externalOrderId && o.externalOrderId.toUpperCase() === requestedOrderId)
        );
        
        if (specificOrder) {
          return {
            message: await this.formatOrderStatus(specificOrder),
            orderIds: [specificOrder.orderId]
          };
        }
      }

      // Return most recent order
      const recentOrder = orders[0];
      let response = await this.formatOrderStatus(recentOrder);

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

  async formatOrderStatus(order) {
    const statusEmoji = {
      'pending': '⏳',
      'processing': '📦',
      'shipped': '🚚',
      'delivered': '✅',
      'cancelled': '❌',
      'return_processing': '🔄',
      'returned': '↩️'
    };

    let currencyCode = 'USD';
    try {
      if (order.admin) {
        const adminDoc = await Admin.findById(order.admin);
        if (adminDoc && adminDoc.currency) {
          currencyCode = adminDoc.currency;
        }
      }
    } catch (err) {
      console.error('Error fetching admin currency in formatOrderStatus:', err);
    }

    const formatCurrency = (amount, code) => {
      try {
        return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-US', {
          style: 'currency',
          currency: code
        }).format(amount);
      } catch (e) {
        const symbols = {
          USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: '$', AUD: '$', JPY: '¥', AED: 'د.إ'
        };
        const symbol = symbols[code] || '$';
        return `${symbol}${Number(amount).toFixed(2)}`;
      }
    };

    const formattedAmount = formatCurrency(order.totalAmount, currencyCode);

    let message = `${statusEmoji[order.status] || '📦'} *Order ${order.orderId}*`;
    if (order.externalOrderId) {
      message += ` (Store Order: *${order.externalOrderId}*)`;
    }
    message += `\n\n`;
    message += `Status: *${order.status.toUpperCase()}*\n`;
    message += `Order Date: ${order.orderDate.toLocaleDateString()}\n`;
    message += `Total: ${formattedAmount}\n`;

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

    const contextual = message.match(/(?:order|#|order\s+id|order\s+no|number)\s*#?\s*([A-Z0-9_-]{3,25})/i);
    if (contextual) {
      return contextual[1].toUpperCase();
    }

    return null;
  }

  async handleCancelOrderRequest(customerPhone, message, adminId = null) {
    try {
      const phoneFormats = this.getPhoneFormats(customerPhone);
      const requestedOrderId = this.extractOrderId(message);
      const phoneQuery = this.buildPhoneSearchQuery(phoneFormats);

      let order = null;

      if (requestedOrderId) {
        order = await Order.findOne({
          ...phoneQuery,
          admin: adminId,
          $or: [
            { orderId: requestedOrderId },
            { externalOrderId: requestedOrderId }
          ]
        });
      } else {
        order = await Order.findOne({
          ...phoneQuery,
          admin: adminId
        })
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

  async handleReturnPolicyQuery(message, adminId = null) {
    try {
      if (adminId) {
        const kbResult = await knowledgeBaseService.queryKnowledgeBase(message, adminId);
        if (kbResult.foundInKB && kbResult.confidence > 0.5) {
          return kbResult.answer;
        }
      }

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

  async handleRefundRequest(customerPhone, customerName, message, adminId = null) {
    try {
      const phoneFormats = this.getPhoneFormats(customerPhone);
      const phoneQuery = this.buildPhoneSearchQuery(phoneFormats);

      // Find recent orders
      const orders = await Order.find({
        ...phoneQuery,
        admin: adminId
      })
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

  async handleGeneralInquiry(message, customerName, recentMessages = [], adminId = null, kbContextOverride = null) {
    const tokenUsageZero = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    };

    let queryText = message;
    const lowerMsg = message.toLowerCase().trim();
    const isFollowUp = 
      lowerMsg.length < 25 && 
      (lowerMsg.includes('detail') || 
       lowerMsg.includes('more') || 
       lowerMsg.includes('info') || 
       lowerMsg.includes('explain') || 
       lowerMsg.includes('why') || 
       lowerMsg.includes('elaborate') || 
       lowerMsg.includes('okay') || 
       lowerMsg.includes('ok') || 
       lowerMsg.includes('yes') || 
       lowerMsg.includes('tell me'));

    if (isFollowUp && recentMessages && recentMessages.length > 0) {
      const lastUserMsg = [...recentMessages].reverse().find(msg => msg.role === 'user');
      if (lastUserMsg && lastUserMsg.content) {
        queryText = `${lastUserMsg.content} ${message}`;
        console.log(`🔄 Follow-up query detected. Merging previous query context: "${queryText}"`);
      }
    }

    let kbContext = kbContextOverride;

    // 1) Fetch Knowledge base context (if no override is provided)
    if (!kbContext) {
      try {
        if (adminId) {
          const kbResult = await knowledgeBaseService.queryKnowledgeBase(queryText, adminId);
          if (kbResult.foundInKB && kbResult.confidence > 0.5) {
            kbContext = kbResult.answer;
          }
        } else {
          const knowledgeBases = await KnowledgeBase.find({ isActive: true });
          if (knowledgeBases.length > 0) {
            const texts = knowledgeBases.map((kb) => kb.extractedText);
            const kbResult = await knowledgeBaseService.queryKnowledgeBase(queryText, texts);
            if (kbResult.foundInKB && kbResult.confidence > 0.5) {
              kbContext = kbResult.answer;
            }
          }
        }
      } catch (error) {
        console.error('Error querying knowledge base:', error);
      }
    }

    // 2) If we have KB context but no LLM is configured/ready, return the KB context directly as a fallback
    if (kbContext && !this.gemini && !this.openai) {
      console.log('⚠️ No LLM configured. Returning raw Knowledge Base answer.');
      const responsePlan = this.buildResponsePlan(kbContext);
      return {
        message: kbContext,
        usedAI: false,
        model: 'KnowledgeBase',
        modelUsed: 'KnowledgeBase',
        tokenUsage: tokenUsageZero,
        aiLogPayload: {
          systemPrompt: 'Knowledge Base Query (RAG Fallback)',
          userPrompt: this.buildContextualPrompt({ customerName, message, recentMessages, kbContext }),
          aiResponse: kbContext,
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

    // Fetch store info from admin profile for contextual replies
    let storeInfo = {};
    if (adminId) {
      try {
        const adminDoc = await Admin.findById(adminId).select('businessName storeUrl supportEmail').lean();
        if (adminDoc) {
          storeInfo = {
            businessName: adminDoc.businessName || null,
            storeUrl: adminDoc.storeUrl || null,
            supportEmail: adminDoc.supportEmail || null
          };
        }
      } catch (err) {
        console.error('Error fetching admin store info for AI prompt:', err.message);
      }
    }

    const systemInstruction = this.buildSystemInstruction(customerName, storeInfo);
    const systemPrompt = systemInstruction;
    const userPrompt = this.buildContextualPrompt({ customerName, message, recentMessages, kbContext });

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

    // 4) Fallback to Knowledge Base context if both model providers are unavailable or fail but we have KB data.
    if (kbContext) {
      console.log('⚠️ LLM providers failed or unavailable at runtime. Falling back to raw KB context.');
      const responsePlan = this.buildResponsePlan(kbContext);
      return {
        message: kbContext,
        usedAI: false,
        model: 'KnowledgeBaseFallback',
        modelUsed: 'KnowledgeBaseFallback',
        tokenUsage: tokenUsageZero,
        aiLogPayload: {
          systemPrompt,
          userPrompt,
          aiResponse: kbContext,
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

    // 5) Static fallback message if both model providers are unavailable or fail and no KB context is available.
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
    const emailService = require('../services/emailService');

    try {
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
              <h1>WhatsApp Chat Escalation Alert</h1>
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
              <p>© ${new Date().getFullYear()} Kwickbot. All rights reserved.</p>
              <p>This is an automated system notification.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `Hello ${adminName},\n\nAn ongoing customer conversation has been escalated to manual support. The AI response helper has been paused, and the customer is waiting for a response.\n\nEscalation Details:\n- Customer Name: ${escalation.customerName}\n- Phone Number: ${escalation.customerPhone}\n- Reason: ${escalation.reason}\n- Priority: ${escalation.priority}\n- Escalated At: ${new Date().toLocaleString('en-IN')}\n- Trigger Message: "${escalation.description}"\n\nTake over the conversation here: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/live-chat\n\nBest regards,\nKwickbot System`;

      await emailService.sendEmail({
        to: recipientEmail,
        subject: `[Escalation Alert] Customer ${escalation.customerName} requests assistance (${escalation.priority.toUpperCase()})`,
        html: emailHtml,
        text: emailText
      });
      console.log(`✅ Escalation email sent to ${recipientEmail}`);

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

  getPublicStoreUrl(adminDoc) {
    if (!adminDoc || !adminDoc.storeUrl) return null;
    
    let url = adminDoc.storeUrl;
    
    // Convert Shopify admin store URL to public myshopify URL
    // e.g., https://admin.shopify.com/store/ai-whatsapp-demo-store -> https://ai-whatsapp-demo-store.myshopify.com
    const shopifyAdminRegex = /admin\.shopify\.com\/store\/([a-zA-Z0-9-]+)/i;
    const match = url.match(shopifyAdminRegex);
    if (match && match[1]) {
      return `https://${match[1]}.myshopify.com`;
    }
    
    // Ensure URL has protocol
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    
    return url;
  }

  async handleNewOrderInquiry(adminDoc) {
    const publicUrl = this.getPublicStoreUrl(adminDoc);
    let storeLinkText = '';
    
    if (publicUrl) {
      storeLinkText = `\n👉 ${publicUrl}`;
    }
    
    return `I cannot place new orders directly here on WhatsApp. 🛍️\n\nPlease place your order directly on our website here:${storeLinkText || ' our online store.'}\n\nIf you have any queries, feel free to send them here, and I will be happy to assist you!`;
  }
}

// Create singleton instance
const aiService = new AIService();

module.exports = aiService;

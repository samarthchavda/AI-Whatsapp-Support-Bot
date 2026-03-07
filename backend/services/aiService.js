const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const ReturnPolicy = require('../models/ReturnPolicy');
const Escalation = require('../models/Escalation');
const Conversation = require('../models/Conversation');
const AILog = require('../models/AILog');

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

  async processMessage({ customerPhone, customerName, message }) {
    const startTime = Date.now();
    let conversation = null;
    let aiLog = null;

    try {
      // Validate input
      const validation = this.validateInput({ customerPhone, customerName, message });
      if (!validation.valid) {
        console.error('Input validation failed:', validation.errors);
        throw new Error(validation.errors.join(', '));
      }

      // Get or create conversation for logging
      conversation = await Conversation.findOne({
        customerPhone,
        status: { $in: ['active', 'escalated'] }
      });

      if (!conversation) {
        conversation = new Conversation({
          customerPhone,
          customerName,
          messages: [],
          status: 'active'
        });
        await conversation.save();
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
            const aiResult = await this.handleGeneralInquiry(message, customerName);
            response = aiResult.message;
            usedAI = aiResult.usedAI;
            aiModel = aiResult.model || null;
            
            // Log AI usage for general inquiry
            if (usedAI && aiResult.aiLog) {
              aiLog = aiResult.aiLog;
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
          dataSource: this.getDataSources(intent, usedAI)
        }
      };

      // Log this interaction in AILog collection
      aiLog = new AILog({
        conversationId: conversation._id,
        customerPhone,
        intent,
        userMessage: message,
        assistantMessage: response,
        aiModel: aiModel || 'none',
        structuredOutput,
        duration,
        error: { occurred: false }
      });
      await aiLog.save();

      return {
        message: response,
        intent,
        escalated,
        escalationReason,
        relatedOrderIds,
        structuredOutput
      };

    } catch (error) {
      console.error('Error processing message:', error);
      
      // Log error
      if (aiLog) {
        aiLog.error = {
          occurred: true,
          message: error.message,
          code: 'MESSAGE_PROCESSING_ERROR'
        };
        aiLog.duration = Date.now() - startTime;
        await aiLog.save().catch(e => console.error('Failed to log error:', e));
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

  async handleGeneralInquiry(message, customerName) {
    let usedAI = false;
    let aiLog = null;
    let model = null;

    const systemPrompt = `You are a friendly and helpful customer service assistant for an e-commerce company specializing in sustainable products.
Your role is to:
- Provide helpful and accurate information
- Be friendly and professional in tone
- Keep responses concise (under 200 characters)
- For policy questions, suggest contacting support
- For urgent matters, recommend escalation
Follow these guidelines:
1. Always be courteous and professional
2. Provide clear, actionable information
3. If unsure, recommend contacting support`;

    const userPrompt = message;

    // Use Gemini first if configured
    if (this.gemini) {
      try {
        const modelClient = this.gemini.getGenerativeModel({ model: this.geminiModelName });
        const prompt = `${systemPrompt}\n\nCustomer Name: ${customerName}\nCustomer Message: ${userPrompt}`;
        const result = await modelClient.generateContent(prompt);
        const aiResponse = result.response.text();

        usedAI = true;
        model = this.geminiModelName;

        aiLog = {
          systemPrompt,
          userPrompt,
          aiResponse,
          promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
          completionTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: result.response.usageMetadata?.totalTokenCount || 0,
          temperature: 0.7
        };

        return {
          message: aiResponse,
          usedAI,
          model,
          aiLog
        };
      } catch (error) {
        console.error('Gemini API error:', error.message);
      }
    }

    // If OpenAI is configured, use it for general inquiries
    if (this.openai) {
      try {
        const completion = await this.openai.chat.completions.create({
          model: this.openaiModelName,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        });

        const aiResponse = completion.choices[0].message.content;
        usedAI = true;
  model = this.openaiModelName;

        // Log the AI interaction
        aiLog = {
          systemPrompt,
          userPrompt,
          aiResponse,
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
          temperature: 0.7
        };

        return {
          message: aiResponse,
          usedAI,
          model,
          aiLog
        };
      } catch (error) {
        console.error('OpenAI API error:', error);
        // Fall through to fallback
      }
    }

    // Fallback response if OpenAI not available or failed
    const fallbackMessage = `Hi ${customerName}! 👋\n\nI'm here to help with:\n` +
      `📦 Order status and tracking\n` +
      `↩️ Returns and exchanges\n` +
      `💰 Refund requests\n` +
      `❓ General questions\n\n` +
      `How can I assist you today?`;

    return {
      message: fallbackMessage,
      usedAI: false,
      model: null,
      aiLog: null
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
        status: 'pending'
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
    // Placeholder for notification logic
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`📧 Support notification sent for escalation ${escalation._id}`);
    console.log(`   Customer: ${escalation.customerName} (${escalation.customerPhone})`);
    console.log(`   Reason: ${escalation.reason}`);
    console.log(`   Priority: ${escalation.priority}`);
    
    // Mark notification as sent
    escalation.notificationSent = true;
    await escalation.save();
  }
}

// Create singleton instance
const aiService = new AIService();

module.exports = aiService;

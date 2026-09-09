const { GoogleGenerativeAI } = require('@google/generative-ai');
const Admin = require('../models/Admin');
const DemoRequest = require('../models/DemoRequest');
const Invoice = require('../models/Invoice');
const WebhookLog = require('../models/WebhookLog');
const whatsappCloudAPI = require('./whatsappCloudAPI');

class SuperAdminBotService {
  constructor() {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiModelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.gemini = geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here'
      ? new GoogleGenerativeAI(geminiApiKey)
      : null;
  }

  /**
   * Normalize phone number and check if authorized (+91 8128420287)
   */
  isAuthorizedSender(phone) {
    if (!phone) return false;
    const digitsOnly = phone.replace(/\D/g, '');
    const last10 = digitsOnly.slice(-10);
    return last10 === '8128420287';
  }

  /**
   * Check if a phone number belongs to a Super Admin.
   */
  async getSuperAdmin(phone) {
    if (!this.isAuthorizedSender(phone)) return null;
    return await Admin.findOne({ role: 'super_admin' });
  }

  /**
   * Gather System Health metrics dynamically.
   */
  getSystemHealthMetrics() {
    const mongoose = require('mongoose');
    const os = require('os');

    const processMemory = process.memoryUsage().heapUsed;
    const processMemoryMB = Math.round(processMemory / 1024 / 1024);

    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const formattedUptime = `${uptimeHours}h ${uptimeMinutes}m`;

    const loadAvg = os.loadavg()[0];
    const cpuCoresCount = os.cpus().length || 1;
    const cpuUsagePct = parseFloat(((loadAvg / cpuCoresCount) * 100).toFixed(1));

    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'Operational' : 'Down';
    const geminiStatus = process.env.GEMINI_API_KEY ? 'Operational' : 'Not Available';

    return {
      backendStatus: 'Operational',
      databaseStatus: dbStatus,
      whatsappStatus: 'Operational',
      aiStatus: geminiStatus,
      memoryUsage: `${processMemoryMB} MB`,
      cpuUsage: `${cpuUsagePct}%`,
      uptime: formattedUptime
    };
  }

  /**
   * Gather ALL platform data for the AI to answer any question.
   */
  async getAllPlatformData() {
    const data = {};

    try {
      // ── System Health ───────────────────────────────────────────
      data.systemHealth = this.getSystemHealthMetrics();

      // ── Merchants ──────────────────────────────────────────────
      const merchants = await Admin.find({ role: 'admin' }).select(
        'name email businessName subscriptionPlan subscriptionStatus isActive whatsappConnected ' +
        'geminiTokensUsed geminiTokensLimit totalMessagesProcessed monthlyPrice customDiscount ' +
        'createdAt subscriptionEndDate phone businessPhone shopifyEnabled woocommerceEnabled'
      );
      data.totalMerchants = merchants.length;
      data.activeMerchants = merchants.filter(m => m.isActive).length;
      data.trialMerchants = merchants.filter(m => m.subscriptionStatus === 'trial').length;
      data.connectedBots = merchants.filter(m => m.whatsappConnected).length;

      data.planBreakdown = {};
      merchants.forEach(m => {
        const plan = m.subscriptionPlan || 'starter';
        data.planBreakdown[plan] = (data.planBreakdown[plan] || 0) + 1;
      });

      data.merchantList = merchants.map(m => ({
        name: m.name,
        email: m.email,
        business: m.businessName || 'N/A',
        plan: m.subscriptionPlan || 'starter',
        status: m.subscriptionStatus || 'N/A',
        active: m.isActive,
        wpConnected: m.whatsappConnected,
        messages: m.totalMessagesProcessed || 0,
        tokensUsed: m.geminiTokensUsed || 0,
        tokenLimit: m.geminiTokensLimit || 50000,
        joinedDate: m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : 'N/A',
        shopify: m.shopifyEnabled,
        woo: m.woocommerceEnabled
      }));

      // ── Revenue / Invoices ─────────────────────────────────────
      const paidInvoices = await Invoice.find({
        $or: [{ paymentStatus: 'completed' }, { status: 'paid' }]
      }).select('totalAmount customerId createdAt');
      data.totalRevenue = paidInvoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
      data.totalInvoices = paidInvoices.length;

      // ── Demo Requests ──────────────────────────────────────────
      data.totalDemos = await DemoRequest.countDocuments();
      data.pendingDemos = await DemoRequest.countDocuments({ status: 'pending' });
      data.completedDemos = await DemoRequest.countDocuments({ status: 'completed' });
      const recentDemos = await DemoRequest.find().sort({ createdAt: -1 }).limit(5)
        .select('name businessName email phone status preferredDate createdAt');
      data.recentDemos = recentDemos.map(d => ({
        name: d.name, business: d.businessName, email: d.email,
        phone: d.phone, status: d.status,
        date: d.preferredDate ? new Date(d.preferredDate).toLocaleDateString('en-IN') : 'N/A',
        requestedOn: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : 'N/A'
      }));

      // ── Conversations ──────────────────────────────────────────
      const Conversation = require('../models/Conversation');
      data.totalConversations = await Conversation.countDocuments();
      data.activeConversations = await Conversation.countDocuments({ status: 'active' });
      data.escalatedConversations = await Conversation.countDocuments({ status: 'escalated' });
      data.botPausedConversations = await Conversation.countDocuments({ botPaused: true });

      // ── Orders ─────────────────────────────────────────────────
      const Order = require('../models/Order');
      data.totalOrders = await Order.countDocuments();
      data.pendingOrders = await Order.countDocuments({ status: 'pending' });
      data.deliveredOrders = await Order.countDocuments({ status: 'delivered' });
      data.cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

      // ── Escalations ────────────────────────────────────────────
      const Escalation = require('../models/Escalation');
      data.totalEscalations = await Escalation.countDocuments();
      data.openEscalations = await Escalation.countDocuments({ status: 'open' });
      data.resolvedEscalations = await Escalation.countDocuments({ status: 'resolved' });

      // ── Leads CRM ──────────────────────────────────────────────
      const Lead = require('../models/Lead');
      data.totalLeads = await Lead.countDocuments();
      data.newLeads = await Lead.countDocuments({ status: 'new' });
      data.convertedLeads = await Lead.countDocuments({ status: 'converted' });

      // ── Knowledge Bases ────────────────────────────────────────
      const KnowledgeBase = require('../models/KnowledgeBase');
      data.totalKBs = await KnowledgeBase.countDocuments();
      const merchantsWithKB = await KnowledgeBase.distinct('admin');
      data.merchantsWithKB = merchantsWithKB.length;

      // ── Broadcasts ─────────────────────────────────────────────
      const Broadcast = require('../models/Broadcast');
      data.totalBroadcasts = await Broadcast.countDocuments();
      data.sentBroadcasts = await Broadcast.countDocuments({ status: 'sent' });

      // ── AI Usage ───────────────────────────────────────────────
      data.totalAIMessages = merchants.reduce((s, m) => s + (m.totalMessagesProcessed || 0), 0);
      data.totalTokensUsed = merchants.reduce((s, m) => s + (m.geminiTokensUsed || 0), 0);

      // ── Failed Webhooks ────────────────────────────────────────
      data.failedWebhooks = await WebhookLog.countDocuments({ status: 'failed' });
      const recentErrors = await WebhookLog.find({ status: 'failed' })
        .sort({ createdAt: -1 }).limit(5)
        .select('source errorMessage externalOrderId createdAt');
      data.recentErrors = recentErrors.map(e => ({
        source: e.source, error: e.errorMessage || 'Unknown',
        orderId: e.externalOrderId,
        time: e.createdAt ? new Date(e.createdAt).toLocaleString('en-IN') : 'N/A'
      }));

      // ── Customers ─────────────────────────────────────────────
      const Customer = require('../models/Customer');
      data.totalCustomers = await Customer.countDocuments();

      // ── Recent Signups (last 7 days) ──────────────────────────
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      data.recentSignups = merchants.filter(m => new Date(m.createdAt) >= sevenDaysAgo).length;

    } catch (err) {
      console.error('Error gathering platform data for Super Admin Bot:', err.message);
    }

    return data;
  }

  /**
   * Format all platform data as a readable text block for the AI prompt.
   */
  formatDataForPrompt(d) {
    const sh = d.systemHealth || {};
    return `
🏥 LIVE SYSTEM HEALTH:
• Backend API: ${sh.backendStatus || 'Operational'}
• Database: ${sh.databaseStatus || 'Connected'}
• WhatsApp Webhook: ${sh.whatsappStatus || 'Operational'}
• AI Service: ${sh.aiStatus || 'Operational'}
• Heap Memory: ${sh.memoryUsage || 'N/A'} | CPU: ${sh.cpuUsage || 'N/A'} | Uptime: ${sh.uptime || 'N/A'}

📊 PLATFORM OVERVIEW:
• Total Merchants: ${d.totalMerchants} (Active: ${d.activeMerchants}, Trial: ${d.trialMerchants})
• WhatsApp Bots Connected: ${d.connectedBots}
• New Signups (last 7 days): ${d.recentSignups}

💳 PLAN BREAKDOWN:
${Object.entries(d.planBreakdown || {}).map(([plan, count]) => `• ${plan.toUpperCase()}: ${count}`).join('\n') || '• None'}

💰 REVENUE:
• Total Revenue Received: ₹${(d.totalRevenue || 0).toLocaleString('en-IN')}
• Total Paid Invoices: ${d.totalInvoices}

📩 DEMO REQUESTS:
• Total: ${d.totalDemos} | Pending: ${d.pendingDemos} | Completed: ${d.completedDemos}
• Recent Demos: ${JSON.stringify(d.recentDemos || [])}

💬 CONVERSATIONS:
• Total: ${d.totalConversations} | Active: ${d.activeConversations}
• Escalated: ${d.escalatedConversations} | Bot Paused: ${d.botPausedConversations}

📦 ORDERS:
• Total: ${d.totalOrders} | Pending: ${d.pendingOrders}
• Delivered: ${d.deliveredOrders} | Cancelled: ${d.cancelledOrders}

🚨 ESCALATIONS:
• Total: ${d.totalEscalations} | Open: ${d.openEscalations} | Resolved: ${d.resolvedEscalations}

👥 LEADS CRM:
• Total Leads: ${d.totalLeads} | New: ${d.newLeads} | Converted: ${d.convertedLeads}

🧠 AI USAGE:
• Total Messages Processed: ${d.totalAIMessages}
• Total Tokens Used: ${(d.totalTokensUsed || 0).toLocaleString()}

📚 KNOWLEDGE BASES:
• Total KB Documents: ${d.totalKBs}
• Merchants with KB Setup: ${d.merchantsWithKB}

📣 BROADCASTS:
• Total: ${d.totalBroadcasts} | Sent: ${d.sentBroadcasts}

👤 CUSTOMERS:
• Total Registered: ${d.totalCustomers}

⚠️ SYSTEM ISSUES:
• Failed Webhook Logs: ${d.failedWebhooks}
• Recent Errors: ${JSON.stringify(d.recentErrors || [])}

🏪 ALL MERCHANTS DETAIL:
${JSON.stringify(d.merchantList || [], null, 2)}
`.trim();
  }

  /**
   * Handle interactive questions from the Super Admin.
   */
  async handleSuperAdminQuery(requestContextOrPhone, senderPhoneOrQuery, queryTextOrCredentials = null, overrideCredentials = null) {
    let requestContext = null;
    let senderPhone = null;
    let queryText = null;
    let customCredentials = null;

    if (typeof requestContextOrPhone === 'object' && requestContextOrPhone !== null) {
      requestContext = requestContextOrPhone;
      senderPhone = senderPhoneOrQuery;
      queryText = queryTextOrCredentials;
      customCredentials = overrideCredentials || requestContext.credentials;
    } else {
      senderPhone = requestContextOrPhone;
      queryText = senderPhoneOrQuery;
      customCredentials = queryTextOrCredentials;
    }

    // Security Isolation Check: Verify contextType is super_admin if context object is passed
    if (requestContext && requestContext.contextType !== 'super_admin') {
      console.error('🔒 [SECURITY ERROR] Super Admin service received non-super_admin contextType! Aborting.');
      throw new Error('Security Isolation Error: Super Admin service cannot process merchant AI requests.');
    }

    if (!this.isAuthorizedSender(senderPhone)) {
      console.warn(`⛔ Unauthorized access attempt to Super Admin Bot from phone: ${senderPhone}`);
      return;
    }

    console.log(`🤖 Super Admin Bot processing query from ${senderPhone}: ${queryText}`);

    // Check for secret key / token requests and enforce security refusal
    const secretKeywords = [
      'access token', 'accesstoken', 'secret', 'password', 'env', 'environment variable',
      'api key', 'apikey', 'key_secret', 'razorpay secret', 'database uri', 'mongodb uri',
      'jwt secret', 'auth secret'
    ];
    const isRequestingSecret = secretKeywords.some(kw => queryText.toLowerCase().includes(kw));
    if (isRequestingSecret) {
      console.log('🔒 Refusing request for secret credentials via Super Admin WhatsApp');
      const refusalMsg = "I cannot provide credentials or secret keys via WhatsApp.";
      await this.sendLongMessage(senderPhone, refusalMsg, 1500, customCredentials);
      return;
    }

    // Gather conversation history for context
    const Conversation = require('../models/Conversation');
    const superAdminDoc = await Admin.findOne({ role: 'super_admin' });
    let convo = await Conversation.findOne({ customerPhone: senderPhone, isSuperAdminChat: true }).sort({ updatedAt: -1 });

    if (!convo && superAdminDoc) {
      convo = new Conversation({
        admin: superAdminDoc._id,
        customerPhone: senderPhone,
        customerName: 'Super Admin',
        isSuperAdminChat: true,
        messages: []
      });
    }

    // Append incoming user query to conversation history
    if (convo) {
      convo.messages.push({
        role: 'user',
        content: queryText,
        timestamp: new Date()
      });
    }

    // Gather ALL platform data
    const platformData = await this.getAllPlatformData();
    const dataText = this.formatDataForPrompt(platformData);

    // Format recent chat history
    let historyText = '';
    if (convo && convo.messages.length > 1) {
      const recentMsgs = convo.messages.slice(-6, -1);
      historyText = recentMsgs.map(m => `${m.role === 'user' ? 'SuperAdmin' : 'Assistant'}: ${m.content}`).join('\n');
    }

    const systemPrompt = `You are the Kwickbot Super Admin WhatsApp Bot assistant.
Your job is to help the platform owner (Super Admin Samarth) monitor, manage, and understand the Kwickbot SaaS platform.

STRICT SECURITY RULE:
- NEVER output passwords, access tokens, API keys, Razorpay secrets, database connection URIs, environment variables, or encryption keys.
- If asked for secrets, respond with: "I cannot provide credentials or secret keys via WhatsApp."

You have access to ALL real-time platform data below. Use it to answer ANY question accurately.

=== REAL-TIME PLATFORM DATA ===
${dataText}
=== END DATA ===

${historyText ? `=== RECENT CONVERSATION HISTORY ===\n${historyText}\n=== END HISTORY ===\n` : ''}
The Super Admin is asking: "${queryText}"

RESPONSE RULES:
- Answer directly and completely using the live data above
- Use clean WhatsApp formatting: *bold* for headers, • for bullets, emojis for sections
- Format System Health responses concisely:
  *System Health*
  ✅ Backend: Healthy
  ✅ Database: Connected
  ✅ WhatsApp: Operational
  ✅ AI Service: Operational
- If asked about a specific merchant, find them in the merchants list and give full details
- If asked about revenue, orders, conversations, escalations — use the exact numbers from data
- Be concise, operational, and accurate`;

    let replyMessage = '';
    if (this.gemini) {
      try {
        const model = this.gemini.getGenerativeModel({
          model: this.geminiModelName,
          generationConfig: { temperature: 0.2, maxOutputTokens: 2000 }
        });
        const result = await model.generateContent(systemPrompt);
        replyMessage = result.response.text().trim();
      } catch (geminiErr) {
        console.error('Gemini error in Super Admin Bot:', geminiErr);
        replyMessage = `⚠️ AI processing error. Live System Summary:\n\n${dataText.substring(0, 1000)}`;
      }
    } else {
      replyMessage = `⚠️ AI not configured. Live System Summary:\n\n${dataText.substring(0, 1000)}`;
    }

    // Save assistant response to conversation history
    if (convo) {
      convo.messages.push({
        role: 'assistant',
        content: replyMessage,
        timestamp: new Date()
      });
      await convo.save();
    }

    // Split and send as WhatsApp messages
    await this.sendLongMessage(senderPhone, replyMessage, 1500, customCredentials);
  }

  /**
   * Helper to get active credentials for sending Super Admin Bot messages
   */
  async getActiveCredentials() {
    try {
      // 1. Prioritize Super Admin Admin record
      const superAdmin = await Admin.findOne({
        role: 'super_admin',
        whatsappConnected: true,
        whatsappAccessToken: { $exists: true, $ne: null },
        whatsappPhoneNumberId: { $exists: true, $ne: null }
      });

      if (superAdmin) {
        return {
          accessToken: superAdmin.whatsappAccessToken,
          phoneNumberId: superAdmin.whatsappPhoneNumberId,
          businessAccountId: superAdmin.whatsappBusinessAccountId
        };
      }

      // 2. Fallback to GlobalSettings if configured
      const GlobalSettings = require('../models/GlobalSettings');
      const tokenSetting = await GlobalSettings.findOne({ key: 'whatsapp_access_token' });
      const phoneIdSetting = await GlobalSettings.findOne({ key: 'whatsapp_phone_number_id' });
      const wabaSetting = await GlobalSettings.findOne({ key: 'whatsapp_business_account_id' });

      if (tokenSetting?.value && phoneIdSetting?.value) {
        return {
          accessToken: tokenSetting.value,
          phoneNumberId: phoneIdSetting.value,
          businessAccountId: wabaSetting?.value || null
        };
      }
    } catch (err) {
      console.error('Error fetching Super Admin credentials for Bot:', err.message);
    }
    return null;
  }

  /**
   * Send a long message as multiple WhatsApp messages split at newlines.
   */
  async sendLongMessage(phone, message, maxLen = 1500, overrideCredentials = null) {
    const customCredentials = overrideCredentials || await this.getActiveCredentials();

    if (message.length <= maxLen) {
      await whatsappCloudAPI.sendMessage(phone, message, customCredentials);
      return;
    }
    const lines = message.split('\n');
    let chunk = '';
    for (const line of lines) {
      if ((chunk + '\n' + line).length > maxLen) {
        if (chunk.trim()) {
          await whatsappCloudAPI.sendMessage(phone, chunk.trim(), customCredentials);
          await new Promise(r => setTimeout(r, 600));
        }
        chunk = line;
      } else {
        chunk = chunk ? chunk + '\n' + line : line;
      }
    }
    if (chunk.trim()) {
      await whatsappCloudAPI.sendMessage(phone, chunk.trim(), customCredentials);
    }
  }

  /**
   * Broadcast proactive alert to all Super Admins.
   */
  async broadcastToSuperAdmins(message) {
    try {
      const customCredentials = await this.getActiveCredentials();
      const superAdmins = await Admin.find({ role: 'super_admin' });
      for (const sa of superAdmins) {
        const phone = sa.phone || sa.businessPhone;
        if (phone) {
          console.log(`📣 Sending proactive alert to Super Admin ${sa.email} (${phone})`);
          await whatsappCloudAPI.sendMessage(phone, message, customCredentials);
        }
      }
    } catch (err) {
      console.error('Error broadcasting alert to super admins:', err.message);
    }
  }

  /**
   * Notify Super Admins when a new demo request is registered.
   */
  async notifyNewDemo(demoRequest) {
    const alertMessage = `🔔 *New Demo Booking Registered!*

👤 *Details:*
• *Name:* ${demoRequest.name}
• *Business Name:* ${demoRequest.businessName || 'N/A'}
• *Phone:* ${demoRequest.phone}
• *Email:* ${demoRequest.email}
• *Requested Date:* ${new Date(demoRequest.preferredDate).toLocaleDateString('en-IN')}

🔗 Manage: https://kwickbot.in/dashboard/super-admin/demo-requests`;
    await this.broadcastToSuperAdmins(alertMessage);
  }

  /**
   * Notify Super Admins when a plan subscription upgrade occurs.
   */
  async notifySubscriptionUpgrade(admin, planName, price) {
    const alertMessage = `💳 *Subscription Plan Upgraded!*

👤 *Merchant Info:*
• *Name:* ${admin.name}
• *Business:* ${admin.businessName || 'N/A'}
• *Email:* ${admin.email}
• *Phone:* ${admin.phone || admin.businessPhone || 'N/A'}

💵 *Subscription:*
• *Plan Purchased:* ${planName.toUpperCase()}
• *Price:* ₹${price.toLocaleString('en-IN')}
• *Status:* Active ✅`;
    await this.broadcastToSuperAdmins(alertMessage);
  }

  /**
   * Notify Super Admins of integration errors.
   */
  async notifySystemError(source, errorMsg, details = '') {
    const alertMessage = `⚠️ *System Integration Error Alert!*

🔧 *Details:*
• *Source:* ${source.toUpperCase()}
• *Error:* ${errorMsg}
• *Time:* ${new Date().toLocaleString('en-IN')}
${details ? `• *Context:* ${details}` : ''}`;
    await this.broadcastToSuperAdmins(alertMessage);
  }
}

module.exports = new SuperAdminBotService();

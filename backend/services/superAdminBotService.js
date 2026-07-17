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
   * Check if a phone number belongs to a Super Admin.
   */
  async getSuperAdmin(phone) {
    if (!phone) return null;
    const normalizedPhone = phone.replace(/\D/g, '');
    const last10 = normalizedPhone.slice(-10);
    const superAdmins = await Admin.find({ role: 'super_admin' });
    return superAdmins.find(sa => {
      const saPhone = (sa.phone || sa.businessPhone || '').replace(/\D/g, '');
      if (!saPhone) return false;
      return saPhone === normalizedPhone || saPhone.slice(-10) === last10;
    });
  }

  /**
   * Gather ALL platform data for the AI to answer any question.
   */
  async getAllPlatformData() {
    const data = {};

    try {
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
    return `
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

⚠️ SYSTEM HEALTH:
• Failed Webhook Logs: ${d.failedWebhooks}
• Recent Errors: ${JSON.stringify(d.recentErrors || [])}

🏪 ALL MERCHANTS DETAIL:
${JSON.stringify(d.merchantList || [], null, 2)}
`.trim();
  }

  /**
   * Handle interactive questions from the Super Admin.
   */
  async handleSuperAdminQuery(senderPhone, queryText) {
    console.log(`🤖 Super Admin Bot processing query from ${senderPhone}: ${queryText}`);

    // Gather ALL platform data
    const platformData = await this.getAllPlatformData();
    const dataText = this.formatDataForPrompt(platformData);

    const systemPrompt = `You are the Kwickbot Super Admin WhatsApp Bot assistant.
Your job is to help the platform owner (Super Admin Samarth) monitor, manage, and understand the Kwickbot SaaS platform.

You have access to ALL real-time platform data below. Use it to answer ANY question accurately.

=== REAL-TIME PLATFORM DATA ===
${dataText}
=== END DATA ===

The Super Admin is asking: "${queryText}"

RESPONSE RULES:
- Answer directly and completely using the data above
- Use WhatsApp formatting: *bold* for headers, • for bullets, emojis for sections
- If asked about a specific merchant, find them in the merchants list and give full details
- If asked about revenue, orders, conversations, escalations — use the exact numbers from data
- If asked a question the data doesn't cover, say so honestly
- Be complete — never cut off mid-sentence
- Keep each response section concise but informative`;

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
        replyMessage = `⚠️ AI error. Raw platform data:\n\n${dataText}`;
      }
    } else {
      replyMessage = `⚠️ AI not configured. Raw platform data:\n\n${dataText}`;
    }

    // Split and send as multiple messages if too long (max 1500 chars per message)
    await this.sendLongMessage(senderPhone, replyMessage);
  }

  /**
   * Send a long message as multiple WhatsApp messages split at newlines.
   */
  async sendLongMessage(phone, message, maxLen = 1500) {
    if (message.length <= maxLen) {
      await whatsappCloudAPI.sendMessage(phone, message);
      return;
    }
    const lines = message.split('\n');
    let chunk = '';
    for (const line of lines) {
      if ((chunk + '\n' + line).length > maxLen) {
        if (chunk.trim()) {
          await whatsappCloudAPI.sendMessage(phone, chunk.trim());
          await new Promise(r => setTimeout(r, 600));
        }
        chunk = line;
      } else {
        chunk = chunk ? chunk + '\n' + line : line;
      }
    }
    if (chunk.trim()) {
      await whatsappCloudAPI.sendMessage(phone, chunk.trim());
    }
  }

  /**
   * Broadcast proactive alert to all Super Admins.
   */
  async broadcastToSuperAdmins(message) {
    try {
      const superAdmins = await Admin.find({ role: 'super_admin' });
      for (const sa of superAdmins) {
        const phone = sa.phone || sa.businessPhone;
        if (phone) {
          console.log(`📣 Sending proactive alert to Super Admin ${sa.email} (${phone})`);
          await whatsappCloudAPI.sendMessage(phone, message);
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

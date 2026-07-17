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
   * @param {string} phone 
   * @returns {Promise<Object|null>} The Super Admin Admin document or null
   */
  async getSuperAdmin(phone) {
    if (!phone) return null;
    const normalizedPhone = phone.replace(/\D/g, '');
    const last10 = normalizedPhone.slice(-10);
    const superAdmins = await Admin.find({ role: 'super_admin' });
    
    return superAdmins.find(sa => {
      const saPhone = (sa.phone || sa.businessPhone || '').replace(/\D/g, '');
      if (!saPhone) return false;
      // Match exact OR by last 10 digits (handles country code variations)
      return saPhone === normalizedPhone || saPhone.slice(-10) === last10;
    });
  }

  /**
   * Get an aggregated, formatted text summary of Kwickbot's health and usage statistics.
   */
  async getSystemSummary() {
    try {
      const totalMerchants = await Admin.countDocuments({ role: 'admin' });
      const activeMerchants = await Admin.countDocuments({ role: 'admin', isActive: true });
      
      const plansBreakdown = await Admin.aggregate([
        { $match: { role: 'admin' } },
        { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } }
      ]);
      const plansStr = plansBreakdown.map(p => `• *${(p._id || 'starter').toUpperCase()}*: ${p.count}`).join('\n') || 'None';

      const totalDemos = await DemoRequest.countDocuments();
      const pendingDemos = await DemoRequest.countDocuments({ status: 'pending' });

      const totalRevenueResult = await Invoice.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

      const failedWebhooksCount = await WebhookLog.countDocuments({ status: 'failed' });

      return `📊 *Kwickbot System Summary Overview*

👥 *Merchants:*
• Total Registered: ${totalMerchants}
• Active Stores: ${activeMerchants}

💳 *Active Plans:*
${plansStr}

📈 *Sales & Demos:*
• Total Demo Requests: ${totalDemos}
• Pending Demos: ${pendingDemos}
• Total Revenue Processed: ₹${totalRevenue.toLocaleString('en-IN')}

⚠️ *System Status:*
• Failed Webhook Syncs: ${failedWebhooksCount}`;
    } catch (err) {
      console.error('Error fetching system summary for super admin bot:', err);
      return '⚠️ Error gathering system summary stats.';
    }
  }

  /**
   * Handle interactive questions from the Super Admin.
   * @param {string} senderPhone 
   * @param {string} queryText 
   */
  async handleSuperAdminQuery(senderPhone, queryText) {
    console.log(`🤖 Super Admin Bot processing query from ${senderPhone}: ${queryText}`);
    
    // 1. Gather real-time system stats
    const statsText = await this.getSystemSummary();

    // 2. Fetch recent errors
    let recentErrorsText = 'None';
    try {
      const recentErrors = await WebhookLog.find({ status: 'failed' })
        .sort({ createdAt: -1 })
        .limit(3);
      if (recentErrors.length > 0) {
        recentErrorsText = recentErrors.map(e => 
          `• [${e.source.toUpperCase()}] ID: ${e.externalOrderId} - Error: ${e.errorMessage || 'Unknown'}`
        ).join('\n');
      }
    } catch (err) {
      console.error('Error fetching recent errors:', err.message);
    }

    // 3. Construct Gemini Prompt
    const systemPrompt = `You are the Kwickbot Super Admin WhatsApp Bot assistant.
Your job is to help the platform owner (the Super Admin) inspect system stats, monitor updates, and manage the platform.

Here are the real-time system stats:
${statsText}

Here are the latest failed integration errors:
${recentErrorsText}

The Super Admin is asking: "${queryText}"

IMPORTANT FORMATTING RULES:
- Use WhatsApp bold (*text*) for headers
- Use bullet points with •
- Use clear emojis for sections
- Keep total response under 1200 characters
- Be complete — do NOT cut off mid-sentence
- If information is long, summarize key points concisely
- Always end with a complete sentence`;

    let replyMessage = '';
    if (this.gemini) {
      try {
        const model = this.gemini.getGenerativeModel({
          model: this.geminiModelName,
          generationConfig: { temperature: 0.3, maxOutputTokens: 1500 }
        });
        const result = await model.generateContent(systemPrompt);
        replyMessage = result.response.text().trim();
      } catch (geminiErr) {
        console.error('Gemini error in Super Admin Bot:', geminiErr);
        replyMessage = `⚠️ AI error. Here is your system summary:\n\n${statsText}`;
      }
    } else {
      replyMessage = `⚠️ AI not configured. Here is the real-time system summary:\n\n${statsText}`;
    }

    // Split and send long replies as multiple WhatsApp messages (max 1500 chars each)
    const MAX_WA_LENGTH = 1500;
    if (replyMessage.length <= MAX_WA_LENGTH) {
      await whatsappCloudAPI.sendMessage(senderPhone, replyMessage);
    } else {
      // Split on newlines at clean boundaries
      const lines = replyMessage.split('\n');
      let chunk = '';
      let partIndex = 1;
      for (const line of lines) {
        if ((chunk + '\n' + line).length > MAX_WA_LENGTH) {
          if (chunk.trim()) {
            await whatsappCloudAPI.sendMessage(senderPhone, chunk.trim());
            await new Promise(r => setTimeout(r, 500)); // small delay between messages
            partIndex++;
          }
          chunk = line;
        } else {
          chunk = chunk ? chunk + '\n' + line : line;
        }
      }
      if (chunk.trim()) {
        await whatsappCloudAPI.sendMessage(senderPhone, chunk.trim());
      }
    }
  }

  /**
   * Broadcast proactive alert to all Super Admins.
   * @param {string} message 
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

🔗 Manage your bookings in the admin panel:
https://kwickbot.in/dashboard/super-admin/demo-requests`;
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
• *Error message:* ${errorMsg}
• *Timestamp:* ${new Date().toLocaleString('en-IN')}
${details ? `• *Context:* ${details}` : ''}`;
    await this.broadcastToSuperAdmins(alertMessage);
  }
}

module.exports = new SuperAdminBotService();

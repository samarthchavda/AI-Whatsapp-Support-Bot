const Admin = require('../models/Admin');
const { PLAN_DEFINITIONS, normalizePlanName, getPlanLimit, isFeatureAllowed } = require('../config/planConstants');

// Export legacy PLAN_LIMITS for backward compatibility if imported elsewhere
const PLAN_LIMITS = {
  starter: { tokens: 50000, messages: 2000, conversations: 500 },
  growth: { tokens: 200000, messages: 15000, conversations: 3000 },
  scale: { tokens: -1, messages: -1, conversations: -1 },
  custom: { tokens: -1, messages: -1, conversations: -1 }
};

/**
 * Validates subscription status, account active state, and billing expiration date.
 * @param {Object} admin - Mongoose Admin document
 * @returns {Object} { valid: boolean, reason: string|null }
 */
function validateSubscriptionStatus(admin) {
  if (!admin) return { valid: false, reason: 'Account record not found' };
  if (!admin.isActive) return { valid: false, reason: 'Your account has been disabled' };

  const status = (admin.subscriptionStatus || 'trial').toLowerCase();
  if (['inactive', 'cancelled', 'suspended'].includes(status)) {
    return { valid: false, reason: `Subscription status is ${status}` };
  }

  const now = new Date();
  if (admin.subscriptionEndDate && new Date(admin.subscriptionEndDate) < now) {
    if (status === 'trial') {
      return { valid: false, reason: 'Free trial period has expired' };
    }
    if (status === 'active') {
      return { valid: false, reason: 'Subscription period has expired. Please renew your plan.' };
    }
  }

  return { valid: true, reason: null };
}

/**
 * Check if a merchant (admin) has exceeded their monthly limits (status, tokens, messages, conversations).
 * @param {Object} admin - The Admin mongoose document
 * @returns {Object} { exceeded: boolean, reason: string }
 */
function checkLimitExceeded(admin) {
  if (!admin) return { exceeded: false, reason: null };

  // 1. Subscription status and expiration validation
  const statusCheck = validateSubscriptionStatus(admin);
  if (!statusCheck.valid) {
    return { exceeded: true, reason: statusCheck.reason };
  }

  const planName = normalizePlanName(admin.subscriptionPlan);
  const planDef = PLAN_DEFINITIONS[planName] || PLAN_DEFINITIONS.starter;

  // 2. Token Limit Check
  const tokenLimit = (admin.geminiTokensLimit !== undefined && admin.geminiTokensLimit !== null)
    ? admin.geminiTokensLimit
    : planDef.features.geminiTokensPerMonth;
  const tokensUsed = admin.geminiTokensUsed || 0;
  if (tokenLimit !== -1 && tokenLimit !== Infinity && tokensUsed >= tokenLimit) {
    return { exceeded: true, reason: `AI token budget reached (${tokensUsed.toLocaleString()}/${tokenLimit.toLocaleString()})` };
  }

  // 3. Conversation Limit Check
  const conversationLimit = planDef.features.maxConversations;
  const conversationsUsed = admin.monthlyConversationsCount || 0;
  if (conversationLimit !== -1 && conversationLimit !== Infinity && conversationsUsed >= conversationLimit) {
    return { exceeded: true, reason: `Monthly WhatsApp conversation limit reached (${conversationsUsed.toLocaleString()}/${conversationLimit.toLocaleString()})` };
  }

  // 4. Message Limit Check
  const messageLimit = planDef.features.maxMessages;
  const messagesProcessed = admin.totalMessagesProcessed || 0;
  if (messageLimit !== -1 && messageLimit !== Infinity && messagesProcessed >= messageLimit) {
    return { exceeded: true, reason: `Monthly WhatsApp message quota reached (${messagesProcessed.toLocaleString()}/${messageLimit.toLocaleString()})` };
  }

  return { exceeded: false, reason: null };
}

/**
 * Daily check to find accounts whose monthly cycle has ended (30 days since last reset)
 * and reset their usage to 0.
 */
async function checkAndResetMonthlyTokens() {
  console.log('⏰ Running monthly subscription usage reset check...');
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Admin.updateMany(
      { 
        isActive: true,
        lastTokenReset: { $lte: thirtyDaysAgo } 
      },
      { 
        $set: { 
          geminiTokensUsed: 0,
          totalMessagesProcessed: 0,
          monthlyConversationsCount: 0,
          broadcastMessagesUsed: 0,
          broadcastCampaignsUsed: 0,
          limitNotificationSent: false,
          lastTokenReset: now 
        } 
      }
    );

    console.log(`✅ Reset usage (tokens, messages, conversations) for ${result.modifiedCount} admin accounts.`);
    return result;
  } catch (error) {
    console.error('❌ Error resetting monthly subscription usage:', error);
    throw error;
  }
}

module.exports = {
  PLAN_LIMITS,
  PLAN_DEFINITIONS,
  normalizePlanName,
  getPlanLimit,
  isFeatureAllowed,
  validateSubscriptionStatus,
  checkLimitExceeded,
  checkAndResetMonthlyTokens
};

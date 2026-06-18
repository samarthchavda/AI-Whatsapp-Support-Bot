const Admin = require('../models/Admin');

const PLAN_LIMITS = {
  starter: { tokens: 100000, messages: 500 },
  professional: { tokens: 500000, messages: 2500 },
  enterprise: { tokens: 2000000, messages: 10000 },
  custom: { tokens: Infinity, messages: Infinity }
};

/**
 * Check if a merchant (admin) has exceeded their monthly token or message limits.
 * @param {Object} admin - The Admin mongoose document
 * @returns {Object} { exceeded: boolean, reason: string }
 */
function checkLimitExceeded(admin) {
  if (!admin) return { exceeded: false, reason: null };
  
  const plan = (admin.subscriptionPlan || 'starter').toLowerCase();
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  
  // Custom limit overrides the plan limit only if it is explicitly set to a non-default value (not 10000)
  const tokenLimit = (admin.geminiTokensLimit !== undefined && admin.geminiTokensLimit !== null && admin.geminiTokensLimit !== 10000) 
    ? admin.geminiTokensLimit 
    : limits.tokens;
  const messageLimit = limits.messages;
  
  const tokensUsed = admin.geminiTokensUsed || 0;
  const messagesProcessed = admin.totalMessagesProcessed || 0;
  
  if (tokensUsed >= tokenLimit) {
    return { exceeded: true, reason: `Token limit reached (${tokensUsed}/${tokenLimit})` };
  }
  
  if (messagesProcessed >= messageLimit) {
    return { exceeded: true, reason: `Message limit reached (${messagesProcessed}/${messageLimit})` };
  }
  
  return { exceeded: false, reason: null };
}

/**
 * Daily check to find accounts whose monthly cycle has ended (30 days since last reset)
 * and reset their token usage to 0.
 */
async function checkAndResetMonthlyTokens() {
  console.log('⏰ Running monthly token usage reset check...');
  try {
    const now = new Date();
    // 30 days ago limit
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find active admins whose lastTokenReset is older than 30 days
    const result = await Admin.updateMany(
      { 
        isActive: true,
        lastTokenReset: { $lte: thirtyDaysAgo } 
      },
      { 
        $set: { 
          geminiTokensUsed: 0,
          totalMessagesProcessed: 0, // Reset processed messages too
          limitNotificationSent: false,
          lastTokenReset: now 
        } 
      }
    );

    console.log(`✅ Reset token usage and message count for ${result.modifiedCount} admin accounts.`);
    return result;
  } catch (error) {
    console.error('❌ Error resetting monthly token usage:', error);
    throw error;
  }
}

module.exports = {
  checkAndResetMonthlyTokens,
  checkLimitExceeded,
  PLAN_LIMITS
};


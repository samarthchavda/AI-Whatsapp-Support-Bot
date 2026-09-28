const Admin = require('../models/Admin');
const PricingPlan = require('../models/PricingPlan');
const { PLAN_DEFINITIONS, normalizePlanName, getPlanLimit, isFeatureAllowed } = require('../config/planConstants');

// Export legacy PLAN_LIMITS for backward compatibility if imported elsewhere
const PLAN_LIMITS = {
  starter: { tokens: 50000, messages: 2000, conversations: 500 },
  growth: { tokens: 200000, messages: 15000, conversations: 3000 },
  scale: { tokens: -1, messages: -1, conversations: -1 },
  custom: { tokens: -1, messages: -1, conversations: -1 }
};

// Permission Profile Defaults
const PERMISSION_PROFILES = {
  starter: ['dashboard', 'conversations', 'knowledge-base', 'integrations', 'profile', 'billing'],
  growth: ['dashboard', 'conversations', 'knowledge-base', 'broadcast', 'analytics', 'escalations', 'integrations', 'profile', 'billing'],
  scale: ['dashboard', 'conversations', 'knowledge-base', 'broadcast', 'analytics', 'escalations', 'templates', 'integrations', 'orders', 'leads', 'api-keys', 'profile', 'billing'],
  crm_basic: ['dashboard', 'conversations', 'integrations', 'leads', 'profile', 'billing'],
  crm_advanced: ['dashboard', 'conversations', 'integrations', 'orders', 'leads', 'analytics', 'profile', 'billing'],
  api_basic: ['dashboard', 'conversations', 'api-keys', 'integrations', 'profile', 'billing'],
  api_advanced: ['dashboard', 'conversations', 'api-keys', 'integrations', 'analytics', 'profile', 'billing'],
  enterprise: ['dashboard', 'conversations', 'knowledge-base', 'broadcast', 'analytics', 'escalations', 'templates', 'integrations', 'orders', 'leads', 'api-keys', 'profile', 'billing'],
  default: ['dashboard', 'conversations', 'profile', 'billing']
};

/**
 * Validates subscription status, account active state, and billing expiration date.
 */
function validateSubscriptionStatus(admin) {
  if (!admin) return { valid: false, reason: 'Account record not found' };
  if (!admin.isActive) return { valid: false, reason: 'Your account has been disabled' };
  if (admin.role === 'super_admin') return { valid: true, reason: null };

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
 * Resolves effective allowed pages for an admin according to priority:
 * 1. Customer-specific override (admin.allowedPages)
 * 2. Plan feature entitlement (plan.allowedPages)
 * 3. Permission-profile default
 * 4. Deny by default
 */
async function resolveEffectiveAllowedPages(admin) {
  if (!admin) return [];
  if (admin.role === 'super_admin') {
    return ['all'];
  }

  // 1. Customer-specific override
  if (Array.isArray(admin.allowedPages) && admin.allowedPages.length > 0) {
    return admin.allowedPages;
  }

  // 2. Plan feature entitlement lookup
  if (admin.pricingPlanId) {
    const plan = await PricingPlan.findById(admin.pricingPlanId);
    if (plan && Array.isArray(plan.allowedPages) && plan.allowedPages.length > 0) {
      return plan.allowedPages;
    }
  }

  const planName = normalizePlanName(admin.subscriptionPlan);
  const plan = await PricingPlan.findOne({ name: planName, isActive: true });
  if (plan && Array.isArray(plan.allowedPages) && plan.allowedPages.length > 0) {
    return plan.allowedPages;
  }

  // 3. Permission profile default
  const profileKey = plan?.permissionProfile || planName || 'default';
  if (PERMISSION_PROFILES[profileKey]) {
    return PERMISSION_PROFILES[profileKey];
  }

  return PERMISSION_PROFILES.default;
}

/**
 * Check if a page permission is allowed for an admin account.
 */
async function isPageAllowed(admin, pageKey) {
  if (!admin) return false;
  if (admin.role === 'super_admin') return true;

  const allowedPages = await resolveEffectiveAllowedPages(admin);
  if (allowedPages.includes('all')) return true;
  return allowedPages.includes(pageKey);
}

/**
 * Check if a feature is allowed for a plan.
 */
async function isFeatureAllowedDynamic(rawPlanName, featureKey) {
  const planName = normalizePlanName(rawPlanName);
  const plan = await PricingPlan.findOne({ name: planName, isActive: true });

  if (plan && plan.features && plan.features[featureKey] !== undefined) {
    return Boolean(plan.features[featureKey]);
  }

  // Fallback to static definitions
  const staticDef = PLAN_DEFINITIONS[planName] || PLAN_DEFINITIONS.starter;
  return Boolean(staticDef.features && staticDef.features[featureKey]);
}

/**
 * Check limit exceeded for admin.
 */
async function checkLimitExceededDynamic(admin) {
  if (!admin) return { exceeded: false, reason: null };

  const statusCheck = validateSubscriptionStatus(admin);
  if (!statusCheck.valid) {
    return { exceeded: true, reason: statusCheck.reason };
  }

  if (admin.role === 'super_admin') {
    return { exceeded: false, reason: null };
  }

  let plan = null;
  if (admin.pricingPlanId) {
    plan = await PricingPlan.findById(admin.pricingPlanId);
  }
  if (!plan) {
    const planName = normalizePlanName(admin.subscriptionPlan);
    plan = await PricingPlan.findOne({ name: planName, isActive: true });
  }

  const limits = plan?.usageLimits || {
    geminiTokensPerMonth: 50000,
    monthlyConversations: 500,
    monthlyMessages: 2000
  };

  // Token limit check
  const tokenLimit = (admin.geminiTokensLimit !== undefined && admin.geminiTokensLimit !== null)
    ? admin.geminiTokensLimit
    : limits.geminiTokensPerMonth;
  const tokensUsed = admin.geminiTokensUsed || 0;
  if (tokenLimit !== -1 && tokenLimit !== Infinity && tokensUsed >= tokenLimit) {
    return { exceeded: true, reason: `AI token budget reached (${tokensUsed.toLocaleString()}/${tokenLimit.toLocaleString()})` };
  }

  // Conversation limit check
  const conversationLimit = limits.monthlyConversations;
  const conversationsUsed = admin.monthlyConversationsCount || 0;
  if (conversationLimit !== -1 && conversationLimit !== Infinity && conversationsUsed >= conversationLimit) {
    return { exceeded: true, reason: `Monthly WhatsApp conversation limit reached (${conversationsUsed.toLocaleString()}/${conversationLimit.toLocaleString()})` };
  }

  // Message limit check
  const messageLimit = limits.monthlyMessages;
  const messagesProcessed = admin.totalMessagesProcessed || 0;
  if (messageLimit !== -1 && messageLimit !== Infinity && messagesProcessed >= messageLimit) {
    return { exceeded: true, reason: `Monthly WhatsApp message quota reached (${messagesProcessed.toLocaleString()}/${messageLimit.toLocaleString()})` };
  }

  return { exceeded: false, reason: null };
}

/**
 * Monthly token & usage reset worker.
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
  }
}

module.exports = {
  PERMISSION_PROFILES,
  PLAN_LIMITS,
  PLAN_DEFINITIONS,
  normalizePlanName,
  getPlanLimit,
  isFeatureAllowed,
  validateSubscriptionStatus,
  resolveEffectiveAllowedPages,
  isPageAllowed,
  isFeatureAllowedDynamic,
  checkLimitExceededDynamic,
  checkLimitExceeded: checkLimitExceededDynamic,
  checkAndResetMonthlyTokens
};

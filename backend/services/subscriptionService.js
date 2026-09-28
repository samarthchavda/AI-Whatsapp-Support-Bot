const mongoose = require('mongoose');
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

const { PERMISSION_PROFILES } = require('../constants/permissionProfiles');

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
  let plan = null;
  const planName = normalizePlanName(admin.subscriptionPlan);

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      if (admin.pricingPlanId) {
        plan = await PricingPlan.findById(admin.pricingPlanId);
        if (plan && Array.isArray(plan.allowedPages) && plan.allowedPages.length > 0) {
          return plan.allowedPages;
        }
      }

      plan = await PricingPlan.findOne({ name: planName, isActive: true });
      if (plan && Array.isArray(plan.allowedPages) && plan.allowedPages.length > 0) {
        return plan.allowedPages;
      }
    } catch (err) {
      console.warn('Failed to query PricingPlan for allowedPages, falling back to static profile:', err.message);
    }
  }

  // 3. Permission profile default
  const profileKey = plan?.permissionProfile || planName || 'default';
  const profile = PERMISSION_PROFILES[profileKey] || PERMISSION_PROFILES.default;
  if (profile) {
    return Array.isArray(profile) ? profile : (profile.pages || []);
  }

  return PERMISSION_PROFILES.default.pages || [];
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
  let plan = null;

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      plan = await PricingPlan.findOne({ name: planName, isActive: true });
      if (plan && plan.features && plan.features[featureKey] !== undefined) {
        return Boolean(plan.features[featureKey]);
      }
    } catch (err) {
      console.warn('Failed to query PricingPlan in isFeatureAllowedDynamic:', err.message);
    }
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
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      if (admin.pricingPlanId) {
        plan = await PricingPlan.findById(admin.pricingPlanId);
      }
      if (!plan) {
        const planName = normalizePlanName(admin.subscriptionPlan);
        plan = await PricingPlan.findOne({ name: planName, isActive: true });
      }
    } catch (err) {
      console.warn('Failed to query PricingPlan in checkLimitExceededDynamic:', err.message);
    }
  }

  const planDef = PLAN_DEFINITIONS[normalizePlanName(admin.subscriptionPlan)];
  const limits = plan?.usageLimits || {
    geminiTokensPerMonth: (planDef?.features?.geminiTokensPerMonth !== undefined) ? planDef.features.geminiTokensPerMonth : 50000,
    monthlyConversations: (planDef?.features?.maxConversations !== undefined) ? planDef.features.maxConversations : 500,
    monthlyMessages: (planDef?.features?.maxMessages !== undefined) ? planDef.features.maxMessages : 2000
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

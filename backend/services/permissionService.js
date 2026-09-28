const Admin = require('../models/Admin');
const PricingPlan = require('../models/PricingPlan');
const { CANONICAL_PAGES, CANONICAL_PERMISSIONS } = require('../constants/permissions');
const { PERMISSION_PROFILES } = require('../constants/permissionProfiles');
const { normalizePlanName } = require('../config/planConstants');

/**
 * Validates account status and subscription active/trial state.
 */
function validateAccountSubscription(admin) {
  if (!admin) {
    return { valid: false, code: 'ACCOUNT_NOT_FOUND', reason: 'Account record not found' };
  }

  if (!admin.isActive) {
    return { valid: false, code: 'ACCOUNT_DISABLED', reason: 'Account is currently deactivated' };
  }

  // Super admins have unrestricted administrative access
  if (admin.role === 'super_admin') {
    return { valid: true, code: 'ACTIVE', reason: null };
  }

  const status = (admin.subscriptionStatus || 'trial').toLowerCase();
  if (['inactive', 'cancelled', 'suspended'].includes(status)) {
    return { valid: false, code: 'SUBSCRIPTION_INACTIVE', reason: `Subscription is ${status}. Payment or renewal required.` };
  }

  const now = new Date();
  if (admin.subscriptionEndDate && new Date(admin.subscriptionEndDate) < now) {
    if (status === 'trial') {
      return { valid: false, code: 'TRIAL_EXPIRED', reason: 'Your free trial has expired. Please select a plan.' };
    }
    return { valid: false, code: 'SUBSCRIPTION_EXPIRED', reason: 'Your subscription has expired. Please renew.' };
  }

  return { valid: true, code: 'ACTIVE', reason: null };
}

const mongoose = require('mongoose');

/**
 * Helper to fetch the active PricingPlan document for an Admin.
 * Handles both pricingPlanId reference and legacy subscriptionPlan string.
 */
async function getAdminPricingPlan(admin) {
  if (!admin) return null;
  if (mongoose.connection.readyState !== 1) return null;

  try {
    if (admin.pricingPlanId) {
      const plan = await PricingPlan.findById(admin.pricingPlanId);
      if (plan) return plan;
    }

    const planName = normalizePlanName(admin.subscriptionPlan || 'starter');
    let plan = await PricingPlan.findOne({ name: planName, isActive: true });
    if (!plan) {
      plan = await PricingPlan.findOne({ slug: planName, isActive: true });
    }

    return plan;
  } catch (err) {
    return null;
  }
}

/**
 * Resolves effective allowed pages and granular permissions for an admin based on priority:
 * 1. Explicit customer deny overrides (admin.deniedPages, admin.deniedPermissions)
 * 2. Explicit customer allow overrides (admin.allowedPages, admin.allowedPermissions)
 * 3. PricingPlan feature entitlements & limits (plan.features, plan.usageLimits)
 * 4. PricingPlan allowedPages (plan.allowedPages)
 * 5. Permission-profile defaults (PERMISSION_PROFILES[plan.permissionProfile])
 * 6. Deny by default
 */
async function resolveEffectivePermissions(adminDoc) {
  if (!adminDoc) {
    return {
      pages: [],
      permissions: [],
      plan: null,
      profile: 'none'
    };
  }

  // Super Admin bypass for administrative context
  if (adminDoc.role === 'super_admin') {
    return {
      pages: Object.values(CANONICAL_PAGES),
      permissions: Object.values(CANONICAL_PERMISSIONS),
      plan: null,
      profile: 'super_admin'
    };
  }

  const plan = await getAdminPricingPlan(adminDoc);
  const profileKey = adminDoc.customPermissionProfile || plan?.permissionProfile || normalizePlanName(adminDoc.subscriptionPlan) || 'default';
  
  // Look up dynamic database PermissionProfile if available
  let dbProfile = null;
  if (mongoose.connection.readyState === 1) {
    try {
      const PermissionProfile = require('../models/PermissionProfile');
      dbProfile = await PermissionProfile.findOne({ key: profileKey, isArchived: { $ne: true } });
    } catch (err) {
      // Database lookup failure gracefully falls back to constants
    }
  }

  const defaultProfile = dbProfile 
    ? { pages: dbProfile.pages || [], permissions: dbProfile.permissions || [] }
    : (PERMISSION_PROFILES[profileKey] || PERMISSION_PROFILES.default);

  // Step 5: Base from Profile defaults
  let effectivePages = new Set(defaultProfile.pages || []);
  let effectivePermissions = new Set(defaultProfile.permissions || []);

  // Step 4: Merge Plan allowedPages if defined
  if (plan && Array.isArray(plan.allowedPages) && plan.allowedPages.length > 0) {
    effectivePages = new Set(plan.allowedPages);
  }

  // Step 3: Entitlement-to-Permission mapping from plan.features
  if (plan && plan.features) {
    const feat = plan.features;
    if (feat.crmConnection) {
      effectivePermissions.add(CANONICAL_PERMISSIONS.CRM_CONNECTION_VIEW);
      effectivePermissions.add(CANONICAL_PERMISSIONS.CRM_CONNECTION_MANAGE);
    }
    if (feat.fieldMapping) {
      effectivePermissions.add(CANONICAL_PERMISSIONS.FIELD_MAPPING_VIEW);
      effectivePermissions.add(CANONICAL_PERMISSIONS.FIELD_MAPPING_MANAGE);
    }
    if (feat.automationRules) {
      effectivePermissions.add(CANONICAL_PERMISSIONS.AUTOMATION_RULES_VIEW);
      effectivePermissions.add(CANONICAL_PERMISSIONS.AUTOMATION_RULES_MANAGE);
    }
    if (feat.failedEventReplay) {
      effectivePermissions.add(CANONICAL_PERMISSIONS.FAILED_EVENTS_RETRY);
      effectivePermissions.add(CANONICAL_PERMISSIONS.FAILED_WEBHOOKS_RETRY);
    }
    if (feat.developerApi || feat.apiKeys) {
      effectivePermissions.add(CANONICAL_PERMISSIONS.API_KEYS_VIEW);
      effectivePermissions.add(CANONICAL_PERMISSIONS.API_KEYS_MANAGE);
    }
    if (feat.customWebhooks) {
      effectivePermissions.add(CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_VIEW);
      effectivePermissions.add(CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_MANAGE);
    }
  }

  // Step 2: Customer-specific ALLOW overrides (admin.allowedPages & admin.allowedPermissions)
  if (Array.isArray(adminDoc.allowedPages) && adminDoc.allowedPages.length > 0) {
    adminDoc.allowedPages.forEach(p => effectivePages.add(p));
  }
  if (Array.isArray(adminDoc.allowedPermissions) && adminDoc.allowedPermissions.length > 0) {
    adminDoc.allowedPermissions.forEach(p => effectivePermissions.add(p));
  }

  // Step 1: Customer-specific DENY overrides (admin.deniedPages & admin.deniedPermissions)
  if (Array.isArray(adminDoc.deniedPages) && adminDoc.deniedPages.length > 0) {
    adminDoc.deniedPages.forEach(p => effectivePages.delete(p));
  }
  if (Array.isArray(adminDoc.deniedPermissions) && adminDoc.deniedPermissions.length > 0) {
    adminDoc.deniedPermissions.forEach(p => effectivePermissions.delete(p));
  }

  return {
    pages: Array.from(effectivePages),
    permissions: Array.from(effectivePermissions),
    plan,
    profile: profileKey
  };
}

/**
 * Returns a sanitized effective-access payload for an authenticated user.
 */
async function getEffectiveAccessPayload(adminDoc) {
  const accountStatus = validateAccountSubscription(adminDoc);
  const { pages, permissions, plan, profile } = await resolveEffectivePermissions(adminDoc);

  // Compute usage limits
  const usageLimits = plan?.usageLimits || {
    monthlyConversations: 500,
    monthlyMessages: 2000,
    monthlyApiRequests: 10000,
    monthlyWebhookDeliveries: 5000,
    monthlyAutomationExecutions: 1000,
    maxWhatsAppConnections: 1,
    maxCrmConnections: 0,
    maxActiveAutomations: 0,
    maxApiKeys: 0,
    maxTeamMembers: 1,
    logRetentionDays: 30,
    geminiTokensPerMonth: 50000
  };

  // Compute current usage snapshot
  const currentUsage = {
    geminiTokensUsed: adminDoc.geminiTokensUsed || 0,
    monthlyConversationsCount: adminDoc.monthlyConversationsCount || 0,
    totalMessagesProcessed: adminDoc.totalMessagesProcessed || 0,
    broadcastMessagesUsed: adminDoc.broadcastMessagesUsed || 0,
    broadcastCampaignsUsed: adminDoc.broadcastCampaignsUsed || 0
  };

  return {
    success: true,
    data: {
      user: {
        id: adminDoc._id,
        email: adminDoc.email,
        name: adminDoc.name,
        role: adminDoc.role
      },
      subscription: {
        planId: plan?._id || null,
        planSlug: plan?.slug || adminDoc.subscriptionPlan || 'starter',
        planName: plan?.displayName || adminDoc.subscriptionPlan || 'Starter',
        planCategory: plan?.category || 'kwickbot_crm',
        billingCycle: adminDoc.billingCycle || 'monthly',
        status: adminDoc.subscriptionStatus || 'trial',
        isValid: accountStatus.valid,
        statusReason: accountStatus.reason,
        startDate: adminDoc.subscriptionStartDate || null,
        endDate: adminDoc.subscriptionEndDate || null
      },
      effectivePages: pages,
      effectivePermissions: permissions,
      permissionProfile: profile,
      usageLimits,
      currentUsage,
      customerOverrides: {
        hasPageOverrides: Array.isArray(adminDoc.allowedPages) && adminDoc.allowedPages.length > 0,
        hasDeniedOverrides: (Array.isArray(adminDoc.deniedPages) && adminDoc.deniedPages.length > 0) || (Array.isArray(adminDoc.deniedPermissions) && adminDoc.deniedPermissions.length > 0)
      },
      integrationStatus: {
        whatsappConnected: Boolean(adminDoc.whatsappConnected)
      }
    }
  };
}

/**
 * Check if a specific page is accessible to an admin.
 */
async function hasPageAccess(adminDoc, pageKey) {
  if (!adminDoc) return false;
  if (adminDoc.role === 'super_admin') return true;

  const status = validateAccountSubscription(adminDoc);
  if (!status.valid) return false;

  const { pages } = await resolveEffectivePermissions(adminDoc);
  return pages.includes(pageKey) || pages.includes('all');
}

/**
 * Check if a specific permission is granted to an admin.
 */
async function hasPermission(adminDoc, permissionKey) {
  if (!adminDoc) return false;
  if (adminDoc.role === 'super_admin') return true;

  const status = validateAccountSubscription(adminDoc);
  if (!status.valid) return false;

  const { permissions } = await resolveEffectivePermissions(adminDoc);
  return permissions.includes(permissionKey);
}

/**
 * Check if a specific plan feature flag is enabled for an admin.
 */
async function hasPlanFeature(adminDoc, featureKey) {
  if (!adminDoc) return false;
  if (adminDoc.role === 'super_admin') return true;

  const plan = await getAdminPricingPlan(adminDoc);
  if (plan && plan.features && plan.features[featureKey] !== undefined) {
    return Boolean(plan.features[featureKey]);
  }

  return false;
}

module.exports = {
  validateAccountSubscription,
  getAdminPricingPlan,
  resolveEffectivePermissions,
  getEffectiveAccessPayload,
  hasPageAccess,
  hasPermission,
  hasPlanFeature
};

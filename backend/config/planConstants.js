/**
 * Official Centralized Subscription Plan Definitions & Features
 * Kwickbot Public Pricing Source of Truth:
 * - STARTER  (starter): ₹1,499/mo | 500 Conversations | 2,000 Messages | 1 WA Connection | 1 PDF (4 pages) | 1 Store Integration | 5 Broadcast Campaigns
 * - GROWTH   (growth):  ₹2,499/mo | Unlimited AI conversations and broadcasts | 3 WA Connections | 2 Store Integrations | Developer API
 * - SCALE    (scale):   ₹9,999/mo | Unlimited Conversations | Unlimited Messages | 5 WA Connections | Unlimited PDF KBs | Multiple Store Integrations | 25,000 Broadcast Msgs | Unlimited Campaigns
 */

const PLAN_DEFINITIONS = {
  starter: {
    name: 'starter',
    displayName: 'Starter Plan',
    monthlyPrice: 1499,
    description: 'Perfect for small e-commerce stores starting out.',
    features: {
      maxConversations: 500,
      maxMessages: 2000,
      maxAiRepliesPerMonth: 2000,
      aiTopupAvailable: false,
      geminiTokensPerMonth: 50000,
      maxWhatsAppConnections: 1,
      maxKbUploads: 1,
      maxKbPdfPages: 4,
      maxIntegrations: 1,
      maxBroadcastMessages: 5000,
      maxBroadcastCampaigns: 5,
      broadcastingAccess: true,
      scheduledBroadcasts: false,
      audienceSegmentation: false,
      broadcastAnalytics: false,
      advancedAnalytics: false,
      escalations: false,
      orderCancellation: false,
      abandonedCartRecovery: false,
      productCatalogSync: false,
      productCatalogAi: false,
      customBranding: false,
      developerApi: false,
      liveChat: true,
      knowledgeBase: true,
      integrations: true,
      prioritySupport: false
    }
  },
  growth: {
    name: 'growth',
    displayName: 'Growth Plan',
    monthlyPrice: 2499,
    description: 'For growing e-commerce stores with AI support, recovery automations, and CRM-ready APIs.',
    features: {
      maxConversations: -1,
      maxMessages: -1,
      maxAiRepliesPerMonth: 5000,
      aiTopupAvailable: true,
      geminiTokensPerMonth: -1,
      maxWhatsAppConnections: 3,
      maxKbUploads: 3,
      maxIntegrations: 2,
      maxBroadcastMessages: -1,
      maxBroadcastCampaigns: -1,
      broadcastingAccess: true,
      scheduledBroadcasts: true,
      audienceSegmentation: true,
      broadcastAnalytics: 'basic',
      advancedAnalytics: true,
      escalations: true,
      orderCancellation: true,
      abandonedCartRecovery: true,
      productCatalogSync: true,
      productCatalogAi: true,
      customBranding: false,
      developerApi: true,
      liveChat: true,
      knowledgeBase: true,
      integrations: true,
      prioritySupport: true
    }
  },
  scale: {
    name: 'scale',
    displayName: 'Scale Plan',
    monthlyPrice: 9999,
    description: 'For large-scale operations requiring maximum power, volume, and customization.',
    features: {
      maxConversations: -1, // -1 or Infinity indicates unlimited
      maxMessages: -1,
      maxAiRepliesPerMonth: -1,
      aiTopupAvailable: true,
      geminiTokensPerMonth: -1,
      maxWhatsAppConnections: 5,
      maxKbUploads: -1,
      maxIntegrations: -1,
      maxBroadcastMessages: 25000,
      maxBroadcastCampaigns: -1,
      broadcastingAccess: true,
      scheduledBroadcasts: true,
      audienceSegmentation: true,
      broadcastAnalytics: 'advanced',
      advancedAnalytics: true,
      escalations: true,
      orderCancellation: true,
      abandonedCartRecovery: true,
      productCatalogSync: true,
      productCatalogAi: true,
      customBranding: true,
      developerApi: true,
      liveChat: true,
      knowledgeBase: true,
      integrations: true,
      prioritySupport: true
    }
  },
  custom: {
    name: 'custom',
    displayName: 'Custom Plan',
    monthlyPrice: 0,
    description: 'Custom Enterprise solutions.',
    features: {
      maxConversations: -1,
      maxMessages: -1,
      maxAiRepliesPerMonth: 5000,
      aiTopupAvailable: true,
      geminiTokensPerMonth: -1,
      maxWhatsAppConnections: 10,
      maxKbUploads: -1,
      maxIntegrations: -1,
      maxBroadcastMessages: 100000,
      maxBroadcastCampaigns: -1,
      broadcastingAccess: true,
      scheduledBroadcasts: true,
      audienceSegmentation: true,
      broadcastAnalytics: 'advanced',
      advancedAnalytics: true,
      escalations: true,
      orderCancellation: true,
      customBranding: true,
      developerApi: true,
      liveChat: true,
      knowledgeBase: true,
      integrations: true,
      prioritySupport: true
    }
  },
  crm_connect: {
    name: 'crm_connect',
    displayName: 'CRM Connect Plan',
    monthlyPrice: 2499,
    description: 'WhatsApp support with two connected business numbers.',
    features: {
      maxConversations: 2000,
      maxMessages: 10000,
      geminiTokensPerMonth: 50000,
      maxWhatsAppConnections: 2,
      maxActiveAutomations: 0,
      maxApiKeys: 0,
      maxKbUploads: 1,
      maxIntegrations: 1,
      maxBroadcastMessages: 5000,
      maxBroadcastCampaigns: 20,
      broadcastingAccess: true,
      scheduledBroadcasts: true,
      audienceSegmentation: true,
      broadcastAnalytics: 'basic',
      advancedAnalytics: false,
      escalations: true,
      orderCancellation: false,
      customBranding: false,
      developerApi: false,
      liveChat: true,
      knowledgeBase: true,
      integrations: true,
      prioritySupport: false
    }
  },
  crm_automation: {
    name: 'crm_automation',
    displayName: 'CRM Automation Plan',
    monthlyPrice: 2999,
    description: 'WhatsApp support with controlled broadcast campaigns.',
    features: {
      maxConversations: 5000,
      maxMessages: 25000,
      geminiTokensPerMonth: 50000,
      maxWhatsAppConnections: 2,
      maxActiveAutomations: 0,
      maxApiKeys: 0,
      maxKbUploads: 1,
      maxIntegrations: 2,
      maxBroadcastMessages: 5000,
      maxBroadcastCampaigns: 5,
      broadcastingAccess: true,
      scheduledBroadcasts: false,
      audienceSegmentation: false,
      broadcastAnalytics: 'basic',
      advancedAnalytics: false,
      escalations: true,
      orderCancellation: false,
      customBranding: false,
      developerApi: false,
      liveChat: true,
      knowledgeBase: true,
      integrations: true,
      prioritySupport: true
    }
  }
};

/**
 * Normalizes legacy plan names ('professional' -> 'growth', 'enterprise' -> 'scale')
 * @param {string} planName
 * @returns {string} Normalized plan name ('starter', 'growth', 'scale', 'custom')
 */
function normalizePlanName(planName) {
  if (!planName) return 'starter';
  const lower = String(planName).toLowerCase().trim();
  if (lower === 'professional' || lower === 'pro') return 'growth';
  if (lower === 'enterprise') return 'scale';
  return lower;
}

/**
 * Helper to check if a feature boolean is enabled for a given plan name
 * @param {string} rawPlanName 
 * @param {string} featureKey 
 * @returns {boolean}
 */
// Live plans (Plan Manager) are the source of truth; PLAN_DEFINITIONS only fill gaps.
// Loaded lazily to avoid a circular require with the PricingPlan model.
function cachedPlan(planKey) {
  try {
    return require('../services/planCache').getCachedPlan(planKey);
  } catch (e) {
    return null;
  }
}

// Template used for keys the live plan does not define. Plans that are not in
// PLAN_DEFINITIONS use the template for their category instead of Starter, so an
// Enterprise or API plan never silently gets Starter limits.
function baseDefinition(planKey, live) {
  if (PLAN_DEFINITIONS[planKey]) return PLAN_DEFINITIONS[planKey];
  if (live && live.category === 'enterprise_custom') return PLAN_DEFINITIONS.custom;
  if (live && live.category === 'crm_integration') return PLAN_DEFINITIONS.crm_connect;
  return PLAN_DEFINITIONS.starter;
}

function isFeatureAllowed(rawPlanName, featureKey) {
  // Broadcasting is accessible to all admin users platform-wide
  if (featureKey === 'broadcastingAccess') {
    return true;
  }
  const planKey = normalizePlanName(rawPlanName);
  const live = cachedPlan(planKey);
  if (live && typeof live.flags[featureKey] === 'boolean') {
    return live.flags[featureKey];
  }
  const def = baseDefinition(planKey, live);
  return Boolean(def.features[featureKey]);
}

/**
 * Helper to get maximum limit numeric value for a given plan name
 * @param {string} rawPlanName 
 * @param {string} limitKey 
 * @returns {number} -1 or Infinity means unlimited
 */
function getPlanLimit(rawPlanName, limitKey) {
  const planKey = normalizePlanName(rawPlanName);
  const live = cachedPlan(planKey);
  if (live && typeof live.limits[limitKey] === 'number') {
    return live.limits[limitKey];
  }
  const def = baseDefinition(planKey, live);
  if (typeof def.features[limitKey] === 'number') {
    return def.features[limitKey];
  }
  return -1;
}

module.exports = {
  PLAN_DEFINITIONS,
  normalizePlanName,
  isFeatureAllowed,
  getPlanLimit
};

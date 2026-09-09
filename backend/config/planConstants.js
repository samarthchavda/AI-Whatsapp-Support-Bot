/**
 * Official Centralized Subscription Plan Definitions & Features
 * Kwickbot Public Pricing Source of Truth:
 * - STARTER  (starter): ₹1,499/mo | 500 Conversations | 2,000 Messages | 1 WA Connection | 1 PDF KB | 1 Store Integration | NO Broadcasting
 * - GROWTH   (growth):  ₹2,999/mo | 3,000 Conversations | 15,000 Messages | 2 WA Connections | 3 PDF KBs | 1 Store Integration | 5,000 Broadcast Msgs | 10 Campaigns
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
      geminiTokensPerMonth: 50000,
      maxWhatsAppConnections: 1,
      maxKbUploads: 1,
      maxIntegrations: 1,
      maxBroadcastMessages: 0,
      maxBroadcastCampaigns: 0,
      broadcastingAccess: false,
      scheduledBroadcasts: false,
      audienceSegmentation: false,
      broadcastAnalytics: 'none',
      advancedAnalytics: false,
      escalations: false,
      orderCancellation: false,
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
    monthlyPrice: 2999,
    description: 'Great for growing businesses looking for premium AI support and WhatsApp broadcasting.',
    features: {
      maxConversations: 3000,
      maxMessages: 15000,
      geminiTokensPerMonth: 200000,
      maxWhatsAppConnections: 2,
      maxKbUploads: 3,
      maxIntegrations: 1,
      maxBroadcastMessages: 5000,
      maxBroadcastCampaigns: 10,
      broadcastingAccess: true,
      scheduledBroadcasts: true,
      audienceSegmentation: true,
      broadcastAnalytics: 'basic',
      advancedAnalytics: true,
      escalations: true,
      orderCancellation: true,
      customBranding: false,
      developerApi: false,
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
  if (PLAN_DEFINITIONS[lower]) return lower;
  return 'starter';
}

/**
 * Helper to check if a feature boolean is enabled for a given plan name
 * @param {string} rawPlanName 
 * @param {string} featureKey 
 * @returns {boolean}
 */
function isFeatureAllowed(rawPlanName, featureKey) {
  const planKey = normalizePlanName(rawPlanName);
  const def = PLAN_DEFINITIONS[planKey] || PLAN_DEFINITIONS.starter;
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
  const def = PLAN_DEFINITIONS[planKey] || PLAN_DEFINITIONS.starter;
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

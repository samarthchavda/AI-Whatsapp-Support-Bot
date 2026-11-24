const planCache = require('../services/planCache');
const { getPlanLimit, isFeatureAllowed, PLAN_DEFINITIONS } = require('../config/planConstants');

// Snapshot of the live plans served by /api/auth/plans/public (Nov 2026)
const LIVE_PLANS = [
  { name: 'starter', category: 'kwickbot_crm',
    usageLimits: { monthlyConversations: 500, monthlyMessages: 2000, geminiTokensPerMonth: 50000, maxWhatsAppConnections: 1, maxKbUploads: 1, maxKbPdfPages: 4, maxIntegrations: 1, maxBroadcastCampaigns: 5, maxBroadcastMessages: 5000 },
    features: { liveChat: true, knowledgeBase: true, broadcasts: true, abandonedCartRecovery: false, advancedAnalytics: false, scheduledBroadcasts: false, productCatalogSync: false, customBranding: false, developerApi: false } },
  { name: 'growth', category: 'kwickbot_crm',
    usageLimits: { monthlyConversations: -1, monthlyMessages: -1, geminiTokensPerMonth: -1, maxWhatsAppConnections: 3, maxKbUploads: 3, maxKbPdfPages: 0, maxIntegrations: 2, maxBroadcastCampaigns: -1, maxBroadcastMessages: -1 },
    features: { liveChat: true, abandonedCartRecovery: true, advancedAnalytics: true, scheduledBroadcasts: true, productCatalogSync: true, customBranding: false, developerApi: true } },
  { name: 'crm_connect', category: 'crm_integration',
    usageLimits: { monthlyConversations: 2000, maxWhatsAppConnections: 1, maxBroadcastCampaigns: 0, maxBroadcastMessages: 0 },
    features: { scheduledBroadcasts: false, customBranding: false } },
  { name: 'api_starter', category: 'whatsapp_api',
    usageLimits: { monthlyConversations: 500, monthlyMessages: 2000, maxWhatsAppConnections: 1, maxApiKeys: 2, maxBroadcastCampaigns: 0, maxBroadcastMessages: 0 },
    features: { developerApi: true, scheduledBroadcasts: false, abandonedCartRecovery: false } },
  { name: 'custom_automation', category: 'enterprise_custom',
    usageLimits: { monthlyConversations: -1, maxWhatsAppConnections: -1, geminiTokensPerMonth: -1 },
    features: { customBranding: true, developerApi: true, scheduledBroadcasts: false } }
];

const ENFORCED_FLAGS = ['abandonedCartRecovery', 'escalations', 'productCatalogSync', 'advancedAnalytics', 'scheduledBroadcasts', 'orderCancellation', 'customBranding'];
const ENFORCED_LIMITS = ['maxConversations', 'maxBroadcastCampaigns', 'maxBroadcastMessages', 'maxKbUploads', 'maxIntegrations', 'maxWhatsAppConnections'];

describe('plan limits follow the live plans', () => {
  beforeAll(() => planCache.__setCacheForTests(LIVE_PLANS));

  test('Starter and Growth enforcement is unchanged for every enforced key', () => {
    for (const plan of ['starter', 'growth']) {
      for (const key of ENFORCED_FLAGS) {
        expect([plan, key, isFeatureAllowed(plan, key)]).toEqual([plan, key, Boolean(PLAN_DEFINITIONS[plan].features[key])]);
      }
      for (const key of ENFORCED_LIMITS) {
        expect([plan, key, getPlanLimit(plan, key)]).toEqual([plan, key, PLAN_DEFINITIONS[plan].features[key]]);
      }
    }
  });

  test('PDF page limit 0 on Growth still means no page limit', () => {
    expect(getPlanLimit('growth', 'maxKbPdfPages') > 0).toBe(false);
    expect(getPlanLimit('starter', 'maxKbPdfPages')).toBe(4);
  });

  test('API Starter uses its own limits, not Starter fallbacks', () => {
    expect(getPlanLimit('api_starter', 'maxApiKeys')).toBe(2);
    expect(getPlanLimit('api_starter', 'maxBroadcastCampaigns')).toBe(0);
    expect(isFeatureAllowed('api_starter', 'developerApi')).toBe(true);
  });

  test('Enterprise is based on the custom template, never Starter', () => {
    expect(getPlanLimit('custom_automation', 'maxConversations')).toBe(-1);
    expect(getPlanLimit('custom_automation', 'maxKbUploads')).toBe(-1); // not set live → custom template
    expect(isFeatureAllowed('custom_automation', 'escalations')).toBe(true);
    expect(isFeatureAllowed('custom_automation', 'customBranding')).toBe(true);
    expect(isFeatureAllowed('custom_automation', 'scheduledBroadcasts')).toBe(false); // live value wins
  });

  test('CRM Connect limits now match Plan Manager', () => {
    expect(getPlanLimit('crm_connect', 'maxWhatsAppConnections')).toBe(1);
    expect(getPlanLimit('crm_connect', 'maxBroadcastCampaigns')).toBe(0);
    expect(isFeatureAllowed('crm_connect', 'escalations')).toBe(true); // not set live → template
  });

  test('broadcasting access stays open to every plan', () => {
    expect(isFeatureAllowed('api_starter', 'broadcastingAccess')).toBe(true);
  });
});

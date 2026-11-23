const { getWhatsappConnectionLimit, getActiveWhatsappPhoneIds, selectWhatsappPhone, getReceivingWhatsappCredentials } = require('../services/whatsappConnectionLimit');
const { defaultPlans } = require('../database/migrations/migratePlansToStandard');
const { getPlanLimit, isFeatureAllowed } = require('../config/planConstants');
const { checkLimitExceededDynamic } = require('../services/subscriptionService');

describe('merchant WhatsApp connection limits', () => {
  test('Starter has one slot while higher plan limits remain', () => {
    expect(getWhatsappConnectionLimit({ role: 'admin', subscriptionPlan: 'starter' })).toBe(1);
    expect(getWhatsappConnectionLimit({ role: 'admin', subscriptionPlan: 'growth' })).toBe(3);
    expect(getWhatsappConnectionLimit({ role: 'admin', subscriptionPlan: 'scale' })).toBe(5);
    expect(getWhatsappConnectionLimit({ role: 'super_admin', subscriptionPlan: 'scale' })).toBe(1);
  });

  test('Starter catalog, broadcast, and PDF limits match the published plan seed', () => {
    const starter = defaultPlans.find(plan => plan.name === 'starter');
    expect(starter.usageLimits.maxWhatsAppConnections).toBe(1);
    expect(starter.usageLimits.maxIntegrations).toBe(1);
    expect(starter.usageLimits.maxKbUploads).toBe(1);
    expect(starter.usageLimits.maxKbPdfPages).toBe(4);
    expect(starter.usageLimits.maxBroadcastCampaigns).toBe(5);
    expect(getPlanLimit('starter', 'maxKbPdfPages')).toBe(4);
    expect(getPlanLimit('starter', 'maxBroadcastCampaigns')).toBe(5);
    expect(isFeatureAllowed('starter', 'broadcastingAccess')).toBe(true);
    expect(isFeatureAllowed('starter', 'productCatalogSync')).toBe(false);
    expect(isFeatureAllowed('starter', 'abandonedCartRecovery')).toBe(false);
  });

  test('Growth at ₹2,499 grants the promised e-commerce limits and API access', async () => {
    const growth = defaultPlans.find(plan => plan.name === 'growth');
    expect(growth.monthlyPrice).toBe(2499);
    expect(growth.yearlyPrice).toBe(24990);
    expect(growth.usageLimits).toMatchObject({
      maxWhatsAppConnections: 3,
      maxIntegrations: 2,
      monthlyConversations: -1,
      monthlyMessages: -1,
      geminiTokensPerMonth: -1,
      maxBroadcastCampaigns: -1,
      maxBroadcastMessages: -1
    });
    expect(growth.features).toMatchObject({
      abandonedCartRecovery: true,
      advancedAnalytics: true,
      developerApi: true,
      apiKeys: true,
      customWebhooks: true
    });
    expect(growth.allowedPages).toEqual(expect.arrayContaining(['abandoned_carts', 'analytics', 'templates', 'api-keys']));
    expect(getPlanLimit('growth', 'maxIntegrations')).toBe(2);
    expect(isFeatureAllowed('growth', 'abandonedCartRecovery')).toBe(true);

    const quota = await checkLimitExceededDynamic({
      isActive: true, subscriptionStatus: 'active', subscriptionPlan: 'growth',
      geminiTokensLimit: -1, geminiTokensUsed: 1000000,
      monthlyConversationsCount: 1000000, totalMessagesProcessed: 1000000
    });
    expect(quota.exceeded).toBe(false);
  });

  test('counts a legacy primary number once alongside stored connections', () => {
    const admin = {
      whatsappConnected: true,
      whatsappPhoneNumberId: 'phone-a',
      whatsappConnections: [
        { phoneNumberId: 'phone-a', isActive: true },
        { phoneNumberId: 'phone-b', isActive: true },
        { phoneNumberId: 'phone-c', isActive: false }
      ]
    };
    expect([...getActiveWhatsappPhoneIds(admin)]).toEqual(['phone-a', 'phone-b']);
    expect([...getActiveWhatsappPhoneIds({ ...admin, whatsappConnections: [] })]).toEqual(['phone-a']);
  });

  test('selects the next unconnected phone from the same Meta account', () => {
    const phones = [{ id: 'phone-a' }, { id: 'phone-b' }];
    const admin = { whatsappConnected: true, whatsappPhoneNumberId: 'phone-a', whatsappConnections: [] };
    expect(selectWhatsappPhone(phones, null, admin)).toBe(phones[1]);
    expect(selectWhatsappPhone(phones, 'phone-a', admin)).toBe(phones[0]);
    expect(selectWhatsappPhone(phones, 'unknown', admin)).toBeNull();
  });

  test('uses the receiving phone token when a second number gets a message', () => {
    const admin = {
      whatsappConnected: true,
      whatsappPhoneNumberId: 'phone-a',
      whatsappAccessToken: 'token-a',
      whatsappBusinessAccountId: 'waba-a',
      whatsappConnections: [
        { phoneNumberId: 'phone-a', accessToken: 'token-a', isActive: true },
        { phoneNumberId: 'phone-b', accessToken: 'token-b', businessAccountId: 'waba-b', isActive: true }
      ]
    };
    expect(getReceivingWhatsappCredentials(admin, 'phone-b')).toEqual({
      accessToken: 'token-b', phoneNumberId: 'phone-b', businessAccountId: 'waba-b'
    });
    expect(getReceivingWhatsappCredentials(admin, 'phone-a').accessToken).toBe('token-a');
    expect(getReceivingWhatsappCredentials(admin, 'unknown')).toBeNull();
  });
});

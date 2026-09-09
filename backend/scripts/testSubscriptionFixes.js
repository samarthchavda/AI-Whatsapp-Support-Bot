const assert = require('assert');
const {
  PLAN_DEFINITIONS,
  normalizePlanName,
  isFeatureAllowed,
  getPlanLimit
} = require('../config/planConstants');
const subscriptionService = require('../services/subscriptionService');

async function runTests() {
  console.log('🧪 Starting Subscription & Plan Limit Verification Tests...\n');

  // Test 1: Plan Identifier Normalization
  console.log('1️⃣ Testing Plan Identifier Normalization...');
  assert.strictEqual(normalizePlanName('starter'), 'starter');
  assert.strictEqual(normalizePlanName('growth'), 'growth');
  assert.strictEqual(normalizePlanName('scale'), 'scale');
  assert.strictEqual(normalizePlanName('professional'), 'growth', 'professional should normalize to growth');
  assert.strictEqual(normalizePlanName('pro'), 'growth', 'pro should normalize to growth');
  assert.strictEqual(normalizePlanName('enterprise'), 'scale', 'enterprise should normalize to scale');
  assert.strictEqual(normalizePlanName('unknown_plan'), 'starter', 'unknown plan defaults to starter');
  console.log('  ✅ Plan Identifier Normalization Passed!');

  // Test 2: Message Limits Verification
  console.log('2️⃣ Testing Official Message Quota Limits...');
  assert.strictEqual(getPlanLimit('starter', 'maxMessages'), 2000, 'Starter message limit should be 2000');
  assert.strictEqual(getPlanLimit('growth', 'maxMessages'), 15000, 'Growth message limit should be 15000');
  assert.strictEqual(getPlanLimit('scale', 'maxMessages'), -1, 'Scale message limit should be unlimited (-1)');
  console.log('  ✅ Official Message Limits Passed!');

  // Test 3: Conversation Limits Verification
  console.log('3️⃣ Testing Official Monthly Conversation Limits...');
  assert.strictEqual(getPlanLimit('starter', 'maxConversations'), 500, 'Starter conversation limit should be 500');
  assert.strictEqual(getPlanLimit('growth', 'maxConversations'), 3000, 'Growth conversation limit should be 3000');
  assert.strictEqual(getPlanLimit('scale', 'maxConversations'), -1, 'Scale conversation limit should be unlimited (-1)');
  console.log('  ✅ Official Conversation Limits Passed!');

  // Test 4: WhatsApp Connection Limits Verification
  console.log('4️⃣ Testing WhatsApp Connection Limits...');
  assert.strictEqual(getPlanLimit('starter', 'maxWhatsAppConnections'), 1, 'Starter WA connections limit should be 1');
  assert.strictEqual(getPlanLimit('growth', 'maxWhatsAppConnections'), 2, 'Growth WA connections limit should be 2');
  assert.strictEqual(getPlanLimit('scale', 'maxWhatsAppConnections'), 5, 'Scale WA connections limit should be 5');
  console.log('  ✅ WhatsApp Connection Limits Passed!');

  // Test 5: Feature Entitlements Matrix
  console.log('5️⃣ Testing Feature Entitlements Matrix...');
  // Starter Gated Features
  assert.strictEqual(isFeatureAllowed('starter', 'advancedAnalytics'), false);
  assert.strictEqual(isFeatureAllowed('starter', 'escalations'), false);
  assert.strictEqual(isFeatureAllowed('starter', 'orderCancellation'), false);
  assert.strictEqual(isFeatureAllowed('starter', 'customBranding'), false);
  assert.strictEqual(isFeatureAllowed('starter', 'developerApi'), false);
  assert.strictEqual(isFeatureAllowed('starter', 'broadcastingAccess'), false);

  // Growth Features
  assert.strictEqual(isFeatureAllowed('growth', 'advancedAnalytics'), true);
  assert.strictEqual(isFeatureAllowed('growth', 'escalations'), true);
  assert.strictEqual(isFeatureAllowed('growth', 'orderCancellation'), true);
  assert.strictEqual(isFeatureAllowed('growth', 'broadcastingAccess'), true);
  assert.strictEqual(isFeatureAllowed('growth', 'scheduledBroadcasts'), true);
  assert.strictEqual(isFeatureAllowed('growth', 'customBranding'), false);
  assert.strictEqual(isFeatureAllowed('growth', 'developerApi'), false);

  // Scale Features
  assert.strictEqual(isFeatureAllowed('scale', 'advancedAnalytics'), true);
  assert.strictEqual(isFeatureAllowed('scale', 'escalations'), true);
  assert.strictEqual(isFeatureAllowed('scale', 'orderCancellation'), true);
  assert.strictEqual(isFeatureAllowed('scale', 'broadcastingAccess'), true);
  assert.strictEqual(isFeatureAllowed('scale', 'scheduledBroadcasts'), true);
  assert.strictEqual(isFeatureAllowed('scale', 'customBranding'), true);
  assert.strictEqual(isFeatureAllowed('scale', 'developerApi'), true);
  console.log('  ✅ Feature Entitlements Matrix Passed!');

  // Test 6: Subscription Status & Expiry Validation
  console.log('6️⃣ Testing Subscription Expiry & Status Validation...');
  const activeAdmin = { isActive: true, subscriptionStatus: 'active', subscriptionEndDate: new Date(Date.now() + 86400000) };
  assert.strictEqual(subscriptionService.validateSubscriptionStatus(activeAdmin).valid, true);

  const expiredPaidAdmin = { isActive: true, subscriptionStatus: 'active', subscriptionEndDate: new Date(Date.now() - 86400000) };
  assert.strictEqual(subscriptionService.validateSubscriptionStatus(expiredPaidAdmin).valid, false, 'Expired active subscription should be invalid');

  const expiredTrialAdmin = { isActive: true, subscriptionStatus: 'trial', subscriptionEndDate: new Date(Date.now() - 86400000) };
  assert.strictEqual(subscriptionService.validateSubscriptionStatus(expiredTrialAdmin).valid, false, 'Expired trial subscription should be invalid');

  const inactiveAdmin = { isActive: true, subscriptionStatus: 'inactive' };
  assert.strictEqual(subscriptionService.validateSubscriptionStatus(inactiveAdmin).valid, false, 'Inactive status should be invalid');

  const disabledAdmin = { isActive: false, subscriptionStatus: 'active' };
  assert.strictEqual(subscriptionService.validateSubscriptionStatus(disabledAdmin).valid, false, 'Disabled account should be invalid');
  console.log('  ✅ Subscription Expiry & Status Validation Passed!');

  // Test 7: Quota Enforcement Logic in checkLimitExceeded
  console.log('7️⃣ Testing Limit Exceeded Quota Checks...');
  const starterAdminNormal = {
    isActive: true,
    subscriptionPlan: 'starter',
    subscriptionStatus: 'active',
    subscriptionEndDate: new Date(Date.now() + 86400000),
    totalMessagesProcessed: 1999,
    monthlyConversationsCount: 499,
    geminiTokensUsed: 1000
  };
  assert.strictEqual(subscriptionService.checkLimitExceeded(starterAdminNormal).exceeded, false);

  const starterAdminMsgBreach = {
    ...starterAdminNormal,
    totalMessagesProcessed: 2000
  };
  assert.strictEqual(subscriptionService.checkLimitExceeded(starterAdminMsgBreach).exceeded, true, 'Starter reaching 2000 messages should breach');

  const starterAdminConvBreach = {
    ...starterAdminNormal,
    monthlyConversationsCount: 500
  };
  assert.strictEqual(subscriptionService.checkLimitExceeded(starterAdminConvBreach).exceeded, true, 'Starter reaching 500 conversations should breach');

  const growthAdminNormal = {
    isActive: true,
    subscriptionPlan: 'growth',
    subscriptionStatus: 'active',
    subscriptionEndDate: new Date(Date.now() + 86400000),
    totalMessagesProcessed: 14999,
    monthlyConversationsCount: 2999
  };
  assert.strictEqual(subscriptionService.checkLimitExceeded(growthAdminNormal).exceeded, false);

  const growthAdminMsgBreach = {
    ...growthAdminNormal,
    totalMessagesProcessed: 15000
  };
  assert.strictEqual(subscriptionService.checkLimitExceeded(growthAdminMsgBreach).exceeded, true, 'Growth reaching 15000 messages should breach');

  const scaleAdminHeavyUsage = {
    isActive: true,
    subscriptionPlan: 'scale',
    subscriptionStatus: 'active',
    subscriptionEndDate: new Date(Date.now() + 86400000),
    totalMessagesProcessed: 999999,
    monthlyConversationsCount: 999999
  };
  assert.strictEqual(subscriptionService.checkLimitExceeded(scaleAdminHeavyUsage).exceeded, false, 'Scale plan should never breach message/conversation limits');
  console.log('  ✅ Quota Enforcement Logic Passed!');

  // Test 8: Broadcasting Access & Quota Limits
  console.log('8️⃣ Testing WhatsApp Broadcasting Access & Quotas...');
  assert.strictEqual(getPlanLimit('starter', 'maxBroadcastMessages'), 0, 'Starter broadcast message limit should be 0');
  assert.strictEqual(getPlanLimit('starter', 'maxBroadcastCampaigns'), 0, 'Starter broadcast campaign limit should be 0');

  assert.strictEqual(getPlanLimit('growth', 'maxBroadcastMessages'), 5000, 'Growth broadcast message limit should be 5000');
  assert.strictEqual(getPlanLimit('growth', 'maxBroadcastCampaigns'), 10, 'Growth broadcast campaign limit should be 10');

  assert.strictEqual(getPlanLimit('scale', 'maxBroadcastMessages'), 25000, 'Scale broadcast message limit should be 25000');
  assert.strictEqual(getPlanLimit('scale', 'maxBroadcastCampaigns'), -1, 'Scale broadcast campaign limit should be unlimited (-1)');
  console.log('  ✅ WhatsApp Broadcasting Access & Quotas Passed!');

  console.log('\n🎉 ALL SUBSCRIPTION, PLAN LIMIT & BROADCASTING TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});

const mongoose = require('mongoose');
const GlobalSettings = require('../models/GlobalSettings');

const TEST_BROADCAST_LIMIT = 2;
const TEST_RECIPIENT_LIMIT = 5;
const TRIAL_POLICY_KEY = 'trial_policy_config';

const DEFAULT_TRIAL_POLICY = {
  trialDays: 14,
  defaultPlan: 'starter',
  enablePreviewMode: true,
  testBroadcastLimit: TEST_BROADCAST_LIMIT,
  testRecipientLimit: TEST_RECIPIENT_LIMIT,
  allowAiInTrial: false,
  allowStoreConnectInTrial: false,
  allowKnowledgeBaseInTrial: false,
  allowAllPagesReadOnly: true,
  bannerTitle: 'Free preview:',
  bannerMessage: 'Connect WhatsApp and send up to {broadcastLimit} test broadcasts. Other pages are view-only until you activate a plan.'
};

const ALLOWED_TRIAL_PLANS = ['starter', 'growth', 'scale'];
const CACHE_TTL_MS = 30 * 1000;
let cachedPolicy = null;
let cacheLoadedAt = 0;

function clampInt(value, fallback, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function cleanText(value, fallback, maxLen = 240) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().slice(0, maxLen);
  return trimmed || fallback;
}

function sanitizeTrialPolicy(input = {}) {
  const rawPlan = typeof input.defaultPlan === 'string' ? input.defaultPlan.toLowerCase().trim() : DEFAULT_TRIAL_POLICY.defaultPlan;
  return {
    trialDays: clampInt(input.trialDays, DEFAULT_TRIAL_POLICY.trialDays, 1, 90),
    defaultPlan: ALLOWED_TRIAL_PLANS.includes(rawPlan) ? rawPlan : DEFAULT_TRIAL_POLICY.defaultPlan,
    enablePreviewMode: input.enablePreviewMode !== undefined ? Boolean(input.enablePreviewMode) : DEFAULT_TRIAL_POLICY.enablePreviewMode,
    testBroadcastLimit: clampInt(input.testBroadcastLimit, DEFAULT_TRIAL_POLICY.testBroadcastLimit, 0, 50),
    testRecipientLimit: clampInt(input.testRecipientLimit, DEFAULT_TRIAL_POLICY.testRecipientLimit, 1, 100),
    allowAiInTrial: input.allowAiInTrial !== undefined ? Boolean(input.allowAiInTrial) : DEFAULT_TRIAL_POLICY.allowAiInTrial,
    allowStoreConnectInTrial: input.allowStoreConnectInTrial !== undefined ? Boolean(input.allowStoreConnectInTrial) : DEFAULT_TRIAL_POLICY.allowStoreConnectInTrial,
    allowKnowledgeBaseInTrial: input.allowKnowledgeBaseInTrial !== undefined ? Boolean(input.allowKnowledgeBaseInTrial) : DEFAULT_TRIAL_POLICY.allowKnowledgeBaseInTrial,
    allowAllPagesReadOnly: input.allowAllPagesReadOnly !== undefined ? Boolean(input.allowAllPagesReadOnly) : DEFAULT_TRIAL_POLICY.allowAllPagesReadOnly,
    bannerTitle: cleanText(input.bannerTitle, DEFAULT_TRIAL_POLICY.bannerTitle, 60),
    bannerMessage: cleanText(input.bannerMessage, DEFAULT_TRIAL_POLICY.bannerMessage, 240)
  };
}

function invalidateTrialPolicyCache() {
  cachedPolicy = null;
  cacheLoadedAt = 0;
}

async function getTrialPolicy() {
  const isMocked = Boolean(GlobalSettings.findOne && GlobalSettings.findOne.mock);
  if (!isMocked && mongoose.connection.readyState !== 1) {
    return { ...DEFAULT_TRIAL_POLICY };
  }

  if (!isMocked && cachedPolicy && (Date.now() - cacheLoadedAt < CACHE_TTL_MS)) {
    return { ...cachedPolicy };
  }

  try {
    const doc = await GlobalSettings.findOne({ key: TRIAL_POLICY_KEY });
    const sanitized = sanitizeTrialPolicy(doc && typeof doc.value === 'object' ? doc.value : {});
    if (!isMocked) {
      cachedPolicy = sanitized;
      cacheLoadedAt = Date.now();
    }
    return { ...sanitized };
  } catch (err) {
    console.error('Error loading trial policy config:', err.message);
    return { ...DEFAULT_TRIAL_POLICY };
  }
}

function isSelfServePreview(admin, now = new Date()) {
  if (!admin || admin.role === 'super_admin' || admin.selfSignupTrial !== true) return false;
  return admin.subscriptionStatus !== 'active' || Boolean(
    admin.subscriptionEndDate && new Date(admin.subscriptionEndDate) <= now
  );
}

const PREVIEW_WRITE_PATHS = {
  PUT: new Set(['/api/auth/profile']),
  POST: new Set([
    '/api/auth/change-password',
    '/api/auth/verify-coupon',
    '/api/auth/razorpay/create-order',
    '/api/auth/razorpay/verify-payment',
    '/api/webhook/embedded-signup',
    '/api/webhook/connect',
    '/api/webhook/disconnect',
    '/api/webhook/settings',
    '/api/whatsapp/templates',
    '/api/whatsapp/templates/sync',
    '/api/broadcasts'
  ])
};

function previewWriteAllowed(method, path, policy = DEFAULT_TRIAL_POLICY) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  if (PREVIEW_WRITE_PATHS[method]?.has(path)) return true;
  if (method === 'POST' && /^\/api\/broadcasts\/[^/]+\/send$/.test(path)) return true;

  if (policy?.allowStoreConnectInTrial && String(path).startsWith('/api/integrations')) {
    return true;
  }
  if (policy?.allowKnowledgeBaseInTrial && String(path).startsWith('/api/knowledge-base')) {
    return true;
  }
  if (policy?.allowAiInTrial && String(path).startsWith('/api/ai')) {
    return true;
  }
  return false;
}

module.exports = {
  TEST_BROADCAST_LIMIT,
  TEST_RECIPIENT_LIMIT,
  TRIAL_POLICY_KEY,
  DEFAULT_TRIAL_POLICY,
  ALLOWED_TRIAL_PLANS,
  sanitizeTrialPolicy,
  invalidateTrialPolicyCache,
  getTrialPolicy,
  isSelfServePreview,
  previewWriteAllowed
};

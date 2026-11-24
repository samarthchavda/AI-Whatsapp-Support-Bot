/**
 * In-memory cache of the live PricingPlan documents (the plans Super Admin edits
 * in Plan Manager). config/planConstants.js reads from this cache synchronously so
 * enforcement matches what the database and the public pricing page say.
 *
 * Refreshed on startup, every minute, and immediately after plan edits.
 */
const PricingPlan = require('../models/PricingPlan');

// DB usageLimits name -> key used by enforcement code
const LIMIT_ALIASES = {
  monthlyConversations: 'maxConversations',
  monthlyMessages: 'maxMessages'
};

let cache = new Map();
let lastLoadedAt = null;
let timer = null;

function toDefinition(plan) {
  const limits = {};
  const usage = (plan.usageLimits && typeof plan.usageLimits.toObject === 'function')
    ? plan.usageLimits.toObject()
    : (plan.usageLimits || {});
  for (const [key, value] of Object.entries(usage)) {
    if (typeof value === 'number') limits[LIMIT_ALIASES[key] || key] = value;
  }
  const flags = {};
  const feats = (plan.features && typeof plan.features.toObject === 'function')
    ? plan.features.toObject()
    : (plan.features || {});
  for (const [key, value] of Object.entries(feats)) {
    if (typeof value === 'boolean') flags[key] = value;
  }
  return { name: plan.name, category: plan.category || '', limits, flags };
}

async function refreshPlanCache() {
  try {
    const plans = await PricingPlan.find({}).lean();
    const next = new Map();
    for (const plan of plans) {
      if (plan && plan.name) next.set(String(plan.name).toLowerCase(), toDefinition(plan));
    }
    cache = next;
    lastLoadedAt = new Date();
  } catch (err) {
    console.error('Plan cache refresh failed (keeping previous values):', err.message);
  }
  return cache.size;
}

function getCachedPlan(planName) {
  if (!planName) return null;
  return cache.get(String(planName).toLowerCase().trim()) || null;
}

function startPlanCacheRefresh(intervalMs = 60 * 1000) {
  refreshPlanCache();
  if (timer) clearInterval(timer);
  timer = setInterval(refreshPlanCache, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
}

// Test helper
function __setCacheForTests(plans) {
  cache = new Map(plans.map((p) => [String(p.name).toLowerCase(), toDefinition(p)]));
}

module.exports = {
  refreshPlanCache,
  getCachedPlan,
  startPlanCacheRefresh,
  getPlanCacheInfo: () => ({ size: cache.size, lastLoadedAt }),
  __setCacheForTests
};

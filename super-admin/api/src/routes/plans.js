const express = require('express');
const { PricingPlan, Admin } = require('../models');
const { audit } = require('../services/audit');

const router = express.Router();

// The main backend's startup migration recreates these if they are deleted,
// so "delete" archives them instead (hidden and inactive).
const STANDARD_PLANS = new Set([
  'starter', 'growth', 'scale', 'crm_connect', 'crm_automation', 'crm_enterprise',
  'api_starter', 'api_growth', 'api_enterprise', 'custom_automation'
]);
const CATEGORIES = ['kwickbot_crm', 'crm_integration', 'whatsapp_api', 'enterprise_custom'];
const FEATURE_KEYS = [
  'dashboardAccess', 'conversations', 'internalOrders', 'internalInvoices', 'internalLeads', 'whatsappConnection',
  'customWebhooks', 'developerApi', 'apiKeys', 'failedEventReplay', 'aiAutomation', 'knowledgeBase',
  'abandonedCartRecovery', 'productCatalogSync', 'productCatalogAi', 'broadcasts', 'broadcastingAccess',
  'scheduledBroadcasts', 'audienceSegmentation', 'advancedAnalytics', 'humanHandoff', 'customBranding',
  'prioritySupport', 'dedicatedSupport', 'customSla'
];
// [key, default] — defaults match the main backend's PricingPlan model
const LIMIT_DEFAULTS = {
  monthlyConversations: 500, monthlyMessages: 2000, monthlyApiRequests: 10000, monthlyWebhookDeliveries: 5000,
  monthlyAutomationExecutions: 1000, maxWhatsAppConnections: 1, maxKbUploads: 1, maxKbPdfPages: 0,
  maxIntegrations: 1, maxActiveAutomations: 0, maxApiKeys: 0, maxTeamMembers: 1, maxBroadcastCampaigns: 0,
  maxBroadcastMessages: 0, logRetentionDays: 30, geminiTokensPerMonth: 50000
};
const FEATURE_DEFAULTS_ON = new Set(['dashboardAccess', 'conversations', 'whatsappConnection', 'aiAutomation', 'knowledgeBase']);

const slugify = (v) => String(v || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const nameify = (v) => String(v || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
const money = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));

/** Checks shown next to each plan. Returns { status, issues } */
function readiness(plan) {
  const issues = [];
  if (!plan.contactSales && !(Number(plan.monthlyPrice) > 0)) issues.push('Set a monthly price or turn on Contact sales');
  if (!plan.contactSales && !(plan.allowedBillingCycles || []).length) issues.push('Pick at least one billing option');
  if (plan.yearlyPrice > 0 && plan.monthlyPrice > 0 && plan.yearlyPrice >= plan.monthlyPrice * 12) issues.push('Yearly price is not cheaper than 12 months');
  if (!(plan.allowedPages || []).length && (!plan.permissionProfile || plan.permissionProfile === 'default')) issues.push('No pages selected and no permission profile');
  if (plan.trialEnabled && !(Number(plan.trialDays) > 0)) issues.push('Free trial is on but has 0 days');
  if (plan.isPublished && !plan.isActive) issues.push('Published but inactive: merchants see it but cannot buy it');
  const invalid = issues.some((i) => i.startsWith('Set a monthly price') || i.startsWith('Pick at least'));
  return { status: invalid ? 'Invalid' : issues.length ? 'Warning' : 'Ready', issues };
}

/** Warnings about how the main backend treats standard plans */
function standardPlanWarnings(plan) {
  if (!STANDARD_PLANS.has(plan.name) || plan.isPublished) return [];
  const warnings = [];
  if (plan.permissionProfile !== plan.name || !(plan.allowedPages || []).length) {
    warnings.push('Draft standard plans get their standard pages and profile back when the main backend restarts. Publish the plan to keep custom pages.');
  }
  return warnings;
}

/** Validate input and build the fields to save. Returns { error } or { fields } */
async function buildPlanFields(body, existing) {
  const displayName = String(body.displayName ?? existing?.displayName ?? '').trim();
  if (!displayName) return { error: 'Plan name is required' };
  const name = nameify(body.name || existing?.name || displayName);
  if (!name) return { error: 'Internal name is required' };
  const category = body.category ?? existing?.category ?? 'kwickbot_crm';
  if (!CATEGORIES.includes(category)) return { error: 'Unknown plan type' };

  if (existing && existing.name !== name) {
    const subscribers = await Admin.countDocuments({ subscriptionPlan: existing.name, role: { $ne: 'super_admin' } });
    if (subscribers > 0) return { error: 'Merchants use this plan, so its internal name can no longer change' };
  }
  const slug = existing?.slug && existing.name === name ? existing.slug : slugify(name);
  const clash = await PricingPlan.findOne({ _id: { $ne: existing?._id }, $or: [{ name }, { slug }] }).select('_id').lean();
  if (clash) return { error: 'Another plan already uses this internal name' };

  const fields = {
    name,
    slug,
    displayName,
    shortDescription: String(body.shortDescription ?? existing?.shortDescription ?? '').trim(),
    detailedDescription: String(body.detailedDescription ?? existing?.detailedDescription ?? '').trim(),
    category,
    currency: 'INR',
    monthlyPrice: money(body.monthlyPrice ?? existing?.monthlyPrice),
    yearlyPrice: (body.yearlyPrice ?? existing?.yearlyPrice) === '' || (body.yearlyPrice ?? existing?.yearlyPrice) == null
      ? null : money(body.yearlyPrice ?? existing?.yearlyPrice),
    setupFee: money(body.setupFee ?? existing?.setupFee),
    connectorMaintenanceFee: money(body.connectorMaintenanceFee ?? existing?.connectorMaintenanceFee),
    contactSales: Boolean(body.contactSales ?? existing?.contactSales ?? false),
    trialEnabled: Boolean(body.trialEnabled ?? existing?.trialEnabled ?? false),
    badge: String(body.badge ?? existing?.badge ?? '').trim() || null,
    isPopular: Boolean(body.isPopular ?? existing?.isPopular ?? false),
    isActive: Boolean(body.isActive ?? existing?.isActive ?? true),
    isPublished: Boolean(body.isPublished ?? existing?.isPublished ?? false),
    allowedBillingCycles: (Array.isArray(body.allowedBillingCycles) ? body.allowedBillingCycles : existing?.allowedBillingCycles || ['monthly', 'yearly'])
      .filter((c) => c === 'monthly' || c === 'yearly'),
    permissionProfile: String(body.permissionProfile ?? existing?.permissionProfile ?? 'default').trim() || 'default',
    allowedPages: [...new Set((Array.isArray(body.allowedPages) ? body.allowedPages : existing?.allowedPages || []).map(String))],
    supportLevel: String(body.supportLevel ?? existing?.supportLevel ?? 'Standard Email Support').trim(),
    sla: String(body.sla ?? existing?.sla ?? 'Best Effort').trim()
  };
  fields.trialDays = fields.trialEnabled ? Math.floor(money(body.trialDays ?? existing?.trialDays)) : 0;

  for (const key of ['monthlyPrice', 'yearlyPrice', 'setupFee', 'connectorMaintenanceFee']) {
    if (fields[key] !== null && (!Number.isFinite(fields[key]) || fields[key] < 0)) {
      return { error: 'Prices and fees must be 0 or more' };
    }
  }
  if (!fields.contactSales && !fields.allowedBillingCycles.length) {
    return { error: 'Pick at least one billing option, or turn on Contact sales' };
  }
  if (fields.trialEnabled && (fields.trialDays < 1 || fields.trialDays > 365)) {
    return { error: 'Trial must be 1 to 365 days' };
  }

  const features = { ...(existing?.features || {}) };
  for (const key of FEATURE_KEYS) {
    if (body.features && key in body.features) features[key] = Boolean(body.features[key]);
    else if (!(key in features)) features[key] = FEATURE_DEFAULTS_ON.has(key);
  }
  fields.features = features;

  const limits = { ...(existing?.usageLimits || {}) };
  for (const [key, fallback] of Object.entries(LIMIT_DEFAULTS)) {
    const raw = body.usageLimits && key in body.usageLimits ? body.usageLimits[key] : limits[key] ?? fallback;
    const value = Math.floor(Number(raw));
    if (!Number.isFinite(value) || value < -1) return { error: `Limit "${key}" must be 0 or more, or Unlimited` };
    limits[key] = value;
  }
  fields.usageLimits = limits;
  return { fields };
}

async function subscriberCounts() {
  const rows = await Admin.aggregate([
    { $match: { role: { $ne: 'super_admin' }, subscriptionStatus: 'active' } },
    { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } }
  ]);
  return Object.fromEntries(rows.filter((r) => r._id).map((r) => [r._id, r.count]));
}

router.get('/', async (req, res, next) => {
  try {
    const [plans, counts] = await Promise.all([
      PricingPlan.find({ archived: { $ne: true } }).sort({ category: 1, displayOrder: 1, createdAt: 1 }).lean(),
      subscriberCounts()
    ]);
    res.json({
      success: true,
      data: plans.map((p) => ({
        ...p,
        isStandard: STANDARD_PLANS.has(p.name),
        activeSubscribersCount: counts[p.name] || 0,
        validation: readiness(p)
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/archived', async (req, res, next) => {
  try {
    const plans = await PricingPlan.find({ archived: true }).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { error, fields } = await buildPlanFields(req.body || {});
    if (error) return res.status(400).json({ success: false, error });
    const last = await PricingPlan.findOne({ category: fields.category }).sort({ displayOrder: -1 }).select('displayOrder').lean();
    const now = new Date();
    const plan = await PricingPlan.create({
      ...fields,
      displayOrder: (last?.displayOrder || 0) + 1,
      configurationVersion: 0,
      customPricing: false,
      managedBySuperAdmin: true,
      createdAt: now,
      updatedAt: now
    });
    await audit(req, 'plan_create', plan.get('name'), { planId: plan._id });
    res.status(201).json({ success: true, message: 'Plan created', data: plan, warnings: standardPlanWarnings(fields) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await PricingPlan.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, error: 'Plan not found' });
    const { error, fields } = await buildPlanFields(req.body || {}, existing);
    if (error) return res.status(400).json({ success: false, error });
    const plan = await PricingPlan.findByIdAndUpdate(
      existing._id,
      { $set: { ...fields, managedBySuperAdmin: true, updatedAt: new Date() } },
      { new: true, lean: true }
    );
    await audit(req, 'plan_update', plan.name, { planId: plan._id });
    res.json({ success: true, message: 'Plan saved', data: plan, warnings: standardPlanWarnings(plan) });
  } catch (error) {
    next(error);
  }
});

// { isPublished?, isActive? }
router.patch('/:id/status', async (req, res, next) => {
  try {
    const set = { updatedAt: new Date() };
    if (req.body?.isPublished !== undefined) set.isPublished = Boolean(req.body.isPublished);
    if (req.body?.isActive !== undefined) set.isActive = Boolean(req.body.isActive);
    const plan = await PricingPlan.findByIdAndUpdate(req.params.id, { $set: set }, { new: true, lean: true });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
    await audit(req, 'plan_status', plan.name, { isPublished: plan.isPublished, isActive: plan.isActive });
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const original = await PricingPlan.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ success: false, error: 'Plan not found' });
    const suffix = Date.now().toString().slice(-4);
    const { _id, createdAt, updatedAt, ...copy } = original;
    const now = new Date();
    const plan = await PricingPlan.create({
      ...copy,
      name: `${original.name}_copy_${suffix}`,
      slug: `${original.slug || slugify(original.name)}-copy-${suffix}`,
      displayName: `${original.displayName} (copy)`,
      isPublished: false,
      isPopular: false,
      badge: null,
      archived: false,
      managedBySuperAdmin: true,
      displayOrder: (original.displayOrder || 0) + 1,
      createdAt: now,
      updatedAt: now
    });
    await audit(req, 'plan_duplicate', plan.get('name'), { from: original.name });
    res.status(201).json({ success: true, message: 'Copy created as a draft', data: plan });
  } catch (error) {
    next(error);
  }
});

// { planOrders: [{ id, displayOrder }] }
router.post('/reorder', async (req, res, next) => {
  try {
    const orders = Array.isArray(req.body?.planOrders) ? req.body.planOrders : [];
    if (!orders.length) return res.status(400).json({ success: false, error: 'Nothing to reorder' });
    await PricingPlan.bulkWrite(orders.map((o) => ({
      updateOne: { filter: { _id: o.id }, update: { $set: { displayOrder: Number(o.displayOrder) || 0, updatedAt: new Date() } } }
    })));
    await audit(req, 'plan_reorder', 'plans', { count: orders.length });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Standard plans are archived (the main backend would recreate them); custom plans are deleted
router.delete('/:id', async (req, res, next) => {
  try {
    const plan = await PricingPlan.findById(req.params.id).lean();
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
    const subscribers = await Admin.countDocuments({ subscriptionPlan: plan.name, role: { $ne: 'super_admin' }, subscriptionStatus: 'active' });
    if (subscribers > 0) {
      return res.status(400).json({ success: false, error: `${subscribers} merchants are subscribed to this plan. Hide it instead.` });
    }
    if (STANDARD_PLANS.has(plan.name)) {
      await PricingPlan.updateOne({ _id: plan._id }, { $set: { archived: true, isPublished: false, isActive: false, updatedAt: new Date() } });
      await audit(req, 'plan_archive', plan.name);
      return res.json({ success: true, archived: true, message: `${plan.displayName} archived. Standard plans are archived, not deleted.` });
    }
    await PricingPlan.deleteOne({ _id: plan._id });
    await audit(req, 'plan_delete', plan.name);
    res.json({ success: true, message: `${plan.displayName} deleted` });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/restore', async (req, res, next) => {
  try {
    const plan = await PricingPlan.findByIdAndUpdate(req.params.id, { $set: { archived: false, isActive: true, updatedAt: new Date() } }, { new: true, lean: true });
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
    await audit(req, 'plan_restore', plan.name);
    res.json({ success: true, message: `${plan.displayName} restored as a draft`, data: plan });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.readiness = readiness;
module.exports.buildPlanFields = buildPlanFields;

const mongoose = require('mongoose');
const PricingPlan = require('../models/PricingPlan');
const { normalizePlanName } = require('../config/planConstants');

const ALLOWED_SUBSCRIPTION_STATUSES = ['active', 'inactive', 'trial', 'cancelled'];

const legacyDefaults = {
  starter: { monthlyPrice: 1499, geminiTokensLimit: 50000 },
  growth: { monthlyPrice: 2999, geminiTokensLimit: 200000 },
  scale: { monthlyPrice: 9999, geminiTokensLimit: -1 },
  custom: { monthlyPrice: 0, geminiTokensLimit: -1 }
};

const toFiniteNumber = (value, fallback) => {
  if (value === '' || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateMonthlyPrice = (plan, billingCycle) => {
  if (!plan) return null;
  if (billingCycle === 'yearly' && plan.yearlyPrice !== null && plan.yearlyPrice !== undefined && Number.isFinite(Number(plan.yearlyPrice))) {
    return Math.round((Number(plan.yearlyPrice) / 12) * 100) / 100;
  }
  return toFiniteNumber(plan.monthlyPrice, 0);
};

const calculateSubscriptionWindow = ({ status, billingCycle, trialDays = 0, now = new Date() }) => {
  const startDate = new Date(now);
  let endDate;

  if (status === 'trial') {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (Number(trialDays) > 0 ? Number(trialDays) : 14));
  } else if (status === 'active') {
    endDate = new Date(startDate);
    if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setDate(endDate.getDate() + 30);
  }

  return { startDate, endDate };
};

const findAssignablePlan = async ({ pricingPlanId, subscriptionPlan }) => {
  if (pricingPlanId) {
    if (!mongoose.Types.ObjectId.isValid(pricingPlanId)) {
      const error = new Error('Invalid pricing plan selection.');
      error.statusCode = 400;
      throw error;
    }

    return PricingPlan.findOne({ _id: pricingPlanId, isActive: { $ne: false } });
  }

  if (!subscriptionPlan) return null;
  const normalizedName = normalizePlanName(subscriptionPlan);
  return PricingPlan.findOne({
    isActive: { $ne: false },
    $or: [{ name: normalizedName }, { slug: normalizedName }]
  });
};

const resolvePlanAssignment = async (input = {}) => {
  const requestedStatus = input.subscriptionStatus || 'trial';
  if (!ALLOWED_SUBSCRIPTION_STATUSES.includes(requestedStatus)) {
    const error = new Error('Invalid subscription status.');
    error.statusCode = 400;
    throw error;
  }

  const plan = await findAssignablePlan(input);
  if (input.pricingPlanId && !plan) {
    const error = new Error('Selected pricing plan is unavailable or inactive.');
    error.statusCode = 400;
    throw error;
  }

  const planName = plan?.name || normalizePlanName(input.subscriptionPlan || 'starter');
  const fallback = legacyDefaults[planName] || legacyDefaults.starter;
  const requestedCycle = input.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const allowedCycles = plan?.allowedBillingCycles?.length ? plan.allowedBillingCycles : ['monthly', 'yearly'];

  if (!allowedCycles.includes(requestedCycle)) {
    const error = new Error(`${requestedCycle === 'yearly' ? 'Yearly' : 'Monthly'} billing is not available for this plan.`);
    error.statusCode = 400;
    throw error;
  }

  const planPrice = plan ? calculateMonthlyPrice(plan, requestedCycle) : fallback.monthlyPrice;
  const mayUseNegotiatedPrice = Boolean(plan?.contactSales || plan?.customPricing || input.customPriceEnabled);
  const requestedPrice = toFiniteNumber(input.monthlyPrice, planPrice);
  if (mayUseNegotiatedPrice && requestedPrice < 0) {
    const error = new Error('Monthly price cannot be negative.');
    error.statusCode = 400;
    throw error;
  }

  const monthlyPrice = mayUseNegotiatedPrice ? requestedPrice : planPrice;
  const planTokens = toFiniteNumber(plan?.usageLimits?.geminiTokensPerMonth, fallback.geminiTokensLimit);
  const requestedTokens = toFiniteNumber(input.geminiTokensLimit, planTokens);
  const geminiTokensLimit = input.overrideLimits === true ? requestedTokens : planTokens;
  if (geminiTokensLimit < -1) {
    const error = new Error('Gemini token limit must be -1 (unlimited) or zero and above.');
    error.statusCode = 400;
    throw error;
  }

  const { startDate, endDate } = calculateSubscriptionWindow({
    status: requestedStatus,
    billingCycle: requestedCycle,
    trialDays: plan?.trialDays || 0
  });

  return {
    plan,
    pricingPlanId: plan?._id || undefined,
    subscriptionPlan: planName,
    billingCycle: requestedCycle,
    subscriptionStatus: requestedStatus,
    monthlyPrice,
    geminiTokensLimit,
    subscriptionStartDate: startDate,
    subscriptionEndDate: endDate,
    isActive: !['inactive', 'cancelled'].includes(requestedStatus)
  };
};

module.exports = {
  ALLOWED_SUBSCRIPTION_STATUSES,
  calculateMonthlyPrice,
  calculateSubscriptionWindow,
  resolvePlanAssignment
};

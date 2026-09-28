const ApiUsageRecord = require('../models/ApiUsageRecord');
const Admin = require('../models/Admin');
const PricingPlan = require('../models/PricingPlan');
const { getAdminPricingPlan } = require('./permissionService');

/**
 * Returns current billing period in format 'YYYY-MM'
 */
function getCurrentBillingPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Record a usage metric entry for an admin account
 */
async function recordUsage(adminId, metric, quantity = 1, metadata = {}) {
  try {
    const billingPeriod = getCurrentBillingPeriod();
    const record = new ApiUsageRecord({
      adminId,
      metric,
      quantity,
      billingPeriod,
      metadata
    });
    await record.save();
    return record;
  } catch (err) {
    console.error('Error recording API usage:', err.message);
  }
}

/**
 * Get total usage count for a given metric and billing period
 */
async function getUsageCount(adminId, metric, billingPeriod = null) {
  const period = billingPeriod || getCurrentBillingPeriod();
  const result = await ApiUsageRecord.aggregate([
    {
      $match: {
        adminId,
        metric,
        billingPeriod: period
      }
    },
    {
      $group: {
        _id: '$metric',
        total: { $sum: '$quantity' }
      }
    }
  ]);

  return result.length > 0 ? result[0].total : 0;
}

/**
 * Get usage summary for an admin for the current billing period
 */
async function getMonthlyUsageSummary(adminId, billingPeriod = null) {
  const period = billingPeriod || getCurrentBillingPeriod();
  const records = await ApiUsageRecord.aggregate([
    {
      $match: {
        adminId,
        billingPeriod: period
      }
    },
    {
      $group: {
        _id: '$metric',
        totalQuantity: { $sum: '$quantity' },
        eventCount: { $sum: 1 }
      }
    }
  ]);

  const summary = {
    billingPeriod: period,
    api_requests: 0,
    webhook_deliveries: 0,
    automation_executions: 0,
    conversations: 0,
    messages: 0,
    crm_sync: 0
  };

  records.forEach(r => {
    if (summary[r._id] !== undefined) {
      summary[r._id] = r.totalQuantity;
    }
  });

  return summary;
}

module.exports = {
  getCurrentBillingPeriod,
  recordUsage,
  getUsageCount,
  getMonthlyUsageSummary
};

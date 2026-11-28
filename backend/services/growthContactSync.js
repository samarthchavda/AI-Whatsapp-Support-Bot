const { normalizePlanName, isFeatureAllowed } = require('../config/planConstants');

function canUseGrowthContactSync(admin) {
  if (!admin || normalizePlanName(admin.subscriptionPlan) !== 'growth') return false;
  if (admin.isActive === false || admin.subscriptionStatus !== 'active') return false;
  if (admin.subscriptionEndDate && new Date(admin.subscriptionEndDate) <= new Date()) return false;
  return isFeatureAllowed('growth', 'whatsappContactSync');
}

module.exports = { canUseGrowthContactSync };

const { CANONICAL_PAGES } = require('../constants/permissions');
const { PERMISSION_PROFILES } = require('../constants/permissionProfiles');

/**
 * Validates a PricingPlan configuration for operational readiness.
 * 
 * @param {Object} plan - The PricingPlan document or object
 * @param {Array<Object>} [existingProfiles=[]] - Optional array of dynamic PermissionProfile documents
 * @returns {Object} { status: 'Ready' | 'Warning' | 'Invalid', issues: string[] }
 */
function validatePlanReadiness(plan, existingProfiles = []) {
  const issues = [];
  let isInvalid = false;

  if (!plan) {
    return { status: 'Invalid', issues: ['Plan data is missing'] };
  }

  // 1. Basic Identity Validation
  if (!plan.name || plan.name.trim() === '') {
    issues.push('Plan unique identifier (name/slug) is missing.');
    isInvalid = true;
  }
  if (!plan.displayName || plan.displayName.trim() === '') {
    issues.push('Plan display name is required.');
    isInvalid = true;
  }

  // 2. Category Validation
  const validCategories = ['kwickbot_crm', 'crm_integration', 'whatsapp_api', 'enterprise_custom'];
  if (!plan.category || !validCategories.includes(plan.category)) {
    issues.push(`Invalid plan category: ${plan.category || 'undefined'}.`);
    isInvalid = true;
  }

  // 3. Pricing Validation
  if (!plan.contactSales && !plan.customPricing) {
    if (plan.monthlyPrice === undefined || plan.monthlyPrice === null || plan.monthlyPrice < 0) {
      issues.push('Monthly price must be a non-negative number.');
      isInvalid = true;
    }
    if (plan.yearlyPrice !== undefined && plan.yearlyPrice !== null && plan.yearlyPrice < 0) {
      issues.push('Yearly price cannot be negative.');
      isInvalid = true;
    }
    if (!plan.allowedBillingCycles || !Array.isArray(plan.allowedBillingCycles) || plan.allowedBillingCycles.length === 0) {
      issues.push('At least one billing cycle (monthly/yearly) must be enabled.');
      isInvalid = true;
    }
  }

  // 4. Permission Profile & Access Pages Validation
  const profileKey = plan.permissionProfile;
  const staticProfile = PERMISSION_PROFILES[profileKey];
  const dbProfile = existingProfiles.find(p => p.key === profileKey);

  if (!profileKey) {
    issues.push('No permission profile assigned. Plan defaults may deny access.');
  } else if (!staticProfile && !dbProfile) {
    issues.push(`Assigned permission profile "${profileKey}" does not exist in standard profiles or custom database profiles.`);
  }

  const allowedPages = Array.isArray(plan.allowedPages) ? plan.allowedPages : [];
  const profilePages = dbProfile?.pages || staticProfile?.pages || [];
  const effectivePages = new Set([...allowedPages, ...profilePages]);

  // 5. Category-Specific Compatibility Checks
  if (plan.category === 'crm_integration') {
    const crmPages = [
      CANONICAL_PAGES.INTEGRATION_DASHBOARD,
      CANONICAL_PAGES.CRM_CONNECTION,
      CANONICAL_PAGES.FIELD_MAPPING,
      CANONICAL_PAGES.AUTOMATION_RULES,
      CANONICAL_PAGES.INTEGRATION_LOGS,
      CANONICAL_PAGES.FAILED_EVENTS
    ];
    const hasCrmPage = crmPages.some(p => effectivePages.has(p));
    if (!hasCrmPage) {
      issues.push('Plan is categorized as CRM Integration, but does not include any CRM Integration pages.');
    }
  } else if (plan.category === 'whatsapp_api') {
    const apiPages = [
      CANONICAL_PAGES.API_DASHBOARD,
      CANONICAL_PAGES.API_KEYS,
      CANONICAL_PAGES.API_DOCUMENTATION,
      CANONICAL_PAGES.WEBHOOK_CONFIGURATION,
      CANONICAL_PAGES.API_LOGS,
      CANONICAL_PAGES.FAILED_WEBHOOKS,
      CANONICAL_PAGES.API_USAGE
    ];
    const hasApiPage = apiPages.some(p => effectivePages.has(p));
    if (!hasApiPage) {
      issues.push('Plan is categorized as WhatsApp API, but does not include any API Platform pages.');
    }
  } else if (plan.category === 'enterprise_custom') {
    if (effectivePages.size === 0) {
      issues.push('Custom Automation plan has no default pages assigned. Merchant access must be configured via customer-specific overrides.');
    }
  }

  // 6. Publication Safety Check
  if (plan.isPublished && !plan.isActive) {
    issues.push('Plan is marked as Published but is Inactive.');
  }

  let status = 'Ready';
  if (isInvalid) {
    status = 'Invalid';
  } else if (issues.length > 0) {
    status = 'Warning';
  }

  return {
    status,
    issues
  };
}

module.exports = {
  validatePlanReadiness
};

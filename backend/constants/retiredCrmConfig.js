// Ignore legacy CRM connector entitlements without modifying historical plan or merchant records.
const retiredPages = new Set([
  'integration-dashboard',
  'crm-connection',
  'field-mapping',
  'automation-rules',
  'integration-logs',
  'failed-events'
]);

const retiredPermissions = new Set([
  'integrationDashboard.view',
  'crmConnection.view',
  'crmConnection.manage',
  'fieldMapping.view',
  'fieldMapping.manage',
  'automationRules.view',
  'automationRules.manage',
  'integrationLogs.view',
  'failedEvents.view',
  'failedEvents.retry'
]);

const retiredFeatures = [
  'crmConnection',
  'leadSync',
  'contactSync',
  'productLookup',
  'quotationCreation',
  'saleOrderCreation',
  'orderStatusSync',
  'fieldMapping',
  'automationRules',
  'integrationLogs'
];

const withoutRetiredPages = (pages) => (Array.isArray(pages) ? pages.filter(page => !retiredPages.has(page)) : []);
const withoutRetiredPermissions = (permissions) => (Array.isArray(permissions) ? permissions.filter(permission => !retiredPermissions.has(permission)) : []);
const withoutRetiredFeatures = (features) => {
  const sanitized = features instanceof Map ? Object.fromEntries(features) : { ...(features || {}) };
  retiredFeatures.forEach(key => delete sanitized[key]);
  return sanitized;
};
const withoutRetiredUsageLimits = (usageLimits) => {
  const sanitized = usageLimits instanceof Map ? Object.fromEntries(usageLimits) : { ...(usageLimits || {}) };
  delete sanitized.maxCrmConnections;
  return sanitized;
};

function withoutRetiredPlanSettings(planData) {
  const sanitized = { ...planData };
  if (Array.isArray(sanitized.allowedPages)) sanitized.allowedPages = withoutRetiredPages(sanitized.allowedPages);
  if (sanitized.features) sanitized.features = withoutRetiredFeatures(sanitized.features);
  if (sanitized.usageLimits) sanitized.usageLimits = withoutRetiredUsageLimits(sanitized.usageLimits);
  return sanitized;
}

module.exports = { withoutRetiredPages, withoutRetiredPermissions, withoutRetiredFeatures, withoutRetiredUsageLimits, withoutRetiredPlanSettings };

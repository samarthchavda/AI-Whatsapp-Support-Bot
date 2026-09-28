/**
 * Canonical Page and Permission Keys for Kwickbot Platform
 */

// Canonical Page Module Identifiers
const CANONICAL_PAGES = {
  // 1. Existing Standard / CRM Dashboard Modules (Backward Compatible)
  DASHBOARD: 'dashboard',
  CONVERSATIONS: 'conversations',
  KNOWLEDGE_BASE: 'knowledge-base',
  BROADCAST: 'broadcast',
  ANALYTICS: 'analytics',
  ESCALATIONS: 'escalations',
  TEMPLATES: 'templates',
  INTEGRATIONS: 'integrations',
  ORDERS: 'orders',
  LEADS: 'leads',
  API_KEYS: 'api-keys',
  PROFILE: 'profile',
  BILLING: 'billing',

  // 2. New CRM Integration Modules
  INTEGRATION_DASHBOARD: 'integration-dashboard',
  CRM_CONNECTION: 'crm-connection',
  FIELD_MAPPING: 'field-mapping',
  AUTOMATION_RULES: 'automation-rules',
  WHATSAPP_TEMPLATES: 'whatsapp-templates',
  INTEGRATION_LOGS: 'integration-logs',
  FAILED_EVENTS: 'failed-events',
  WHATSAPP_CONNECTION: 'whatsapp-connection',
  USAGE: 'usage',
  SETTINGS: 'settings',

  // 3. New WhatsApp API Modules
  API_DASHBOARD: 'api-dashboard',
  API_DOCUMENTATION: 'api-documentation',
  WEBHOOK_CONFIGURATION: 'webhook-configuration',
  API_LOGS: 'api-logs',
  FAILED_WEBHOOKS: 'failed-webhooks',
  API_USAGE: 'api-usage'
};

// Canonical Granular Machine-Readable Permission Keys
const CANONICAL_PERMISSIONS = {
  // CRM Integration Permissions
  INTEGRATION_DASHBOARD_VIEW: 'integrationDashboard.view',
  CRM_CONNECTION_VIEW: 'crmConnection.view',
  CRM_CONNECTION_MANAGE: 'crmConnection.manage',
  FIELD_MAPPING_VIEW: 'fieldMapping.view',
  FIELD_MAPPING_MANAGE: 'fieldMapping.manage',
  AUTOMATION_RULES_VIEW: 'automationRules.view',
  AUTOMATION_RULES_MANAGE: 'automationRules.manage',
  INTEGRATION_LOGS_VIEW: 'integrationLogs.view',
  FAILED_EVENTS_VIEW: 'failedEvents.view',
  FAILED_EVENTS_RETRY: 'failedEvents.retry',
  WHATSAPP_CONNECTION_VIEW: 'whatsappConnection.view',
  WHATSAPP_CONNECTION_MANAGE: 'whatsappConnection.manage',
  WHATSAPP_TEMPLATES_VIEW: 'whatsappTemplates.view',
  WHATSAPP_TEMPLATES_MANAGE: 'whatsappTemplates.manage',

  // WhatsApp API Permissions
  API_DASHBOARD_VIEW: 'apiDashboard.view',
  API_KEYS_VIEW: 'apiKeys.view',
  API_KEYS_MANAGE: 'apiKeys.manage',
  API_DOCUMENTATION_VIEW: 'apiDocumentation.view',
  WEBHOOK_CONFIGURATION_VIEW: 'webhookConfiguration.view',
  WEBHOOK_CONFIGURATION_MANAGE: 'webhookConfiguration.manage',
  API_LOGS_VIEW: 'apiLogs.view',
  FAILED_WEBHOOKS_VIEW: 'failedWebhooks.view',
  FAILED_WEBHOOKS_RETRY: 'failedWebhooks.retry',
  API_USAGE_VIEW: 'apiUsage.view',

  // Shared System & Platform Permissions
  USAGE_VIEW: 'usage.view',
  BILLING_VIEW: 'billing.view',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage'
};

module.exports = {
  CANONICAL_PAGES,
  CANONICAL_PERMISSIONS
};

const { CANONICAL_PAGES, CANONICAL_PERMISSIONS } = require('../constants/permissions');
const { PERMISSION_PROFILES } = require('../constants/permissionProfiles');
const { validatePlanReadiness } = require('../services/planValidationService');
const { resolveEffectivePermissions, validateAccountSubscription } = require('../services/permissionService');

describe('Super Admin Permission System & 10 Standard Plans Verification', () => {
  describe('1. Canonical Pages & Permissions Invariants', () => {
    test('Canonical pages contain all expected CRM Integration and WhatsApp API module keys', () => {
      // CRM Integration pages
      expect(CANONICAL_PAGES.INTEGRATION_DASHBOARD).toBe('integration-dashboard');
      expect(CANONICAL_PAGES.CRM_CONNECTION).toBe('crm-connection');
      expect(CANONICAL_PAGES.FIELD_MAPPING).toBe('field-mapping');
      expect(CANONICAL_PAGES.AUTOMATION_RULES).toBe('automation-rules');
      expect(CANONICAL_PAGES.WHATSAPP_TEMPLATES).toBe('whatsapp-templates');
      expect(CANONICAL_PAGES.INTEGRATION_LOGS).toBe('integration-logs');
      expect(CANONICAL_PAGES.FAILED_EVENTS).toBe('failed-events');

      // WhatsApp API pages
      expect(CANONICAL_PAGES.API_DASHBOARD).toBe('api-dashboard');
      expect(CANONICAL_PAGES.API_KEYS).toBe('api-keys');
      expect(CANONICAL_PAGES.API_DOCUMENTATION).toBe('api-documentation');
      expect(CANONICAL_PAGES.WEBHOOK_CONFIGURATION).toBe('webhook-configuration');
      expect(CANONICAL_PAGES.API_LOGS).toBe('api-logs');
      expect(CANONICAL_PAGES.FAILED_WEBHOOKS).toBe('failed-webhooks');
      expect(CANONICAL_PAGES.API_USAGE).toBe('api-usage');
    });

    test('Canonical permissions define granular machine-readable permission keys', () => {
      expect(CANONICAL_PERMISSIONS.INTEGRATION_DASHBOARD_VIEW).toBe('integrationDashboard.view');
      expect(CANONICAL_PERMISSIONS.CRM_CONNECTION_MANAGE).toBe('crmConnection.manage');
      expect(CANONICAL_PERMISSIONS.FIELD_MAPPING_MANAGE).toBe('fieldMapping.manage');
      expect(CANONICAL_PERMISSIONS.AUTOMATION_RULES_MANAGE).toBe('automationRules.manage');
      expect(CANONICAL_PERMISSIONS.FAILED_EVENTS_RETRY).toBe('failedEvents.retry');
      expect(CANONICAL_PERMISSIONS.API_KEYS_MANAGE).toBe('apiKeys.manage');
      expect(CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_MANAGE).toBe('webhookConfiguration.manage');
      expect(CANONICAL_PERMISSIONS.FAILED_WEBHOOKS_RETRY).toBe('failedWebhooks.retry');
    });
  });

  describe('2. All 10 Standard Plans Profile Verification', () => {
    // 1. Starter
    test('Starter CRM profile has basic pages and no CRM or API modules', () => {
      const starter = PERMISSION_PROFILES.starter;
      expect(starter.pages).toContain('dashboard');
      expect(starter.pages).toContain('conversations');
      expect(starter.pages).not.toContain('integration-dashboard');
      expect(starter.pages).not.toContain('api-dashboard');
    });

    // 2. Growth
    test('Growth CRM profile includes broadcasts, analytics, escalations', () => {
      const growth = PERMISSION_PROFILES.growth;
      expect(growth.pages).toContain('broadcast');
      expect(growth.pages).toContain('analytics');
      expect(growth.pages).toContain('escalations');
      expect(growth.pages).not.toContain('integration-dashboard');
    });

    // 3. Scale
    test('Scale Enterprise CRM profile includes orders, leads, and api-keys', () => {
      const scale = PERMISSION_PROFILES.scale;
      expect(scale.pages).toContain('orders');
      expect(scale.pages).toContain('leads');
      expect(scale.pages).toContain('api-keys');
      expect(scale.permissions).toContain(CANONICAL_PERMISSIONS.API_KEYS_MANAGE);
    });

    // 4. CRM Connect
    test('CRM Connect profile includes CRM integration pages and permissions', () => {
      const connect = PERMISSION_PROFILES.crm_connect;
      expect(connect.pages).toContain('integration-dashboard');
      expect(connect.pages).toContain('crm-connection');
      expect(connect.pages).toContain('field-mapping');
      expect(connect.pages).toContain('integration-logs');
      expect(connect.pages).not.toContain('automation-rules');
      expect(connect.permissions).toContain(CANONICAL_PERMISSIONS.CRM_CONNECTION_VIEW);
      expect(connect.permissions).toContain(CANONICAL_PERMISSIONS.CRM_CONNECTION_MANAGE);
    });

    // 5. CRM Automation
    test('CRM Automation profile includes automation rules and failed event retry', () => {
      const automation = PERMISSION_PROFILES.crm_automation;
      expect(automation.pages).toContain('automation-rules');
      expect(automation.pages).toContain('failed-events');
      expect(automation.permissions).toContain(CANONICAL_PERMISSIONS.AUTOMATION_RULES_MANAGE);
      expect(automation.permissions).toContain(CANONICAL_PERMISSIONS.FAILED_EVENTS_RETRY);
    });

    // 6. CRM Enterprise
    test('CRM Enterprise profile includes webhooks and full CRM integration suite', () => {
      const enterprise = PERMISSION_PROFILES.crm_enterprise;
      expect(enterprise.pages).toContain('webhook-configuration');
      expect(enterprise.pages).toContain('automation-rules');
      expect(enterprise.pages).toContain('failed-events');
      expect(enterprise.permissions).toContain(CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_MANAGE);
    });

    // 7. API Starter
    test('API Starter profile includes API keys, docs, webhooks, and logs', () => {
      const apiStarter = PERMISSION_PROFILES.api_starter;
      expect(apiStarter.pages).toContain('api-dashboard');
      expect(apiStarter.pages).toContain('api-keys');
      expect(apiStarter.pages).toContain('api-documentation');
      expect(apiStarter.pages).toContain('webhook-configuration');
      expect(apiStarter.pages).toContain('api-logs');
      expect(apiStarter.pages).not.toContain('failed-webhooks');
      expect(apiStarter.permissions).toContain(CANONICAL_PERMISSIONS.API_KEYS_MANAGE);
    });

    // 8. API Growth
    test('API Growth profile includes failed webhooks retry queue', () => {
      const apiGrowth = PERMISSION_PROFILES.api_growth;
      expect(apiGrowth.pages).toContain('failed-webhooks');
      expect(apiGrowth.permissions).toContain(CANONICAL_PERMISSIONS.FAILED_WEBHOOKS_RETRY);
    });

    // 9. API Enterprise
    test('API Enterprise profile includes full developer platform suite', () => {
      const apiEnterprise = PERMISSION_PROFILES.api_enterprise;
      expect(apiEnterprise.pages).toContain('api-dashboard');
      expect(apiEnterprise.pages).toContain('failed-webhooks');
      expect(apiEnterprise.permissions).toContain(CANONICAL_PERMISSIONS.API_KEYS_MANAGE);
      expect(apiEnterprise.permissions).toContain(CANONICAL_PERMISSIONS.FAILED_WEBHOOKS_RETRY);
    });

    // 10. Custom Automation
    test('Custom Automation profile is strictly deny-by-default until explicitly configured', () => {
      const custom = PERMISSION_PROFILES.custom_automation;
      expect(custom.pages).toEqual([]);
      expect(custom.permissions).toEqual([]);
    });
  });

  describe('3. Permission Resolution Priority Chain', () => {
    test('Super Admin role bypasses normal restrictions with all canonical pages & permissions', async () => {
      const superAdminUser = {
        role: 'super_admin',
        isActive: true,
        subscriptionStatus: 'active'
      };
      const result = await resolveEffectivePermissions(superAdminUser);
      expect(result.profile).toBe('super_admin');
      expect(result.pages).toEqual(expect.arrayContaining([CANONICAL_PAGES.DASHBOARD, CANONICAL_PAGES.CRM_CONNECTION]));
    });

    test('Customer Allow Overrides grant access beyond base profile', async () => {
      const merchant = {
        role: 'admin',
        subscriptionPlan: 'starter',
        allowedPages: ['integration-dashboard', 'crm-connection'],
        allowedPermissions: ['crmConnection.view']
      };
      const result = await resolveEffectivePermissions(merchant);
      expect(result.pages).toContain('integration-dashboard');
      expect(result.pages).toContain('crm-connection');
      expect(result.permissions).toContain('crmConnection.view');
      // Still retains base starter pages
      expect(result.pages).toContain('conversations');
    });

    test('Customer Deny Overrides take absolute precedence over allow overrides and plan defaults', async () => {
      const merchant = {
        role: 'admin',
        subscriptionPlan: 'scale',
        allowedPages: ['conversations', 'orders'],
        deniedPages: ['orders'],
        deniedPermissions: ['apiKeys.manage']
      };
      const result = await resolveEffectivePermissions(merchant);
      // Denied page must NOT be present
      expect(result.pages).not.toContain('orders');
      // Denied permission must NOT be present
      expect(result.permissions).not.toContain('apiKeys.manage');
      // Other scale pages remain
      expect(result.pages).toContain('conversations');
    });
  });

  describe('4. Account & Subscription Validation', () => {
    test('Deactivated accounts are rejected', () => {
      const disabledAdmin = { isActive: false, role: 'admin' };
      const status = validateAccountSubscription(disabledAdmin);
      expect(status.valid).toBe(false);
      expect(status.code).toBe('ACCOUNT_DISABLED');
    });

    test('Expired subscriptions are rejected', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const expiredAdmin = {
        isActive: true,
        role: 'admin',
        subscriptionStatus: 'active',
        subscriptionEndDate: pastDate
      };
      const status = validateAccountSubscription(expiredAdmin);
      expect(status.valid).toBe(false);
      expect(status.code).toBe('SUBSCRIPTION_EXPIRED');
    });

    test('Active subscriptions with future end date are valid', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 25);
      const activeAdmin = {
        isActive: true,
        role: 'admin',
        subscriptionStatus: 'active',
        subscriptionEndDate: futureDate
      };
      const status = validateAccountSubscription(activeAdmin);
      expect(status.valid).toBe(true);
      expect(status.code).toBe('ACTIVE');
    });
  });

  describe('5. Plan Readiness & Validation Service', () => {
    test('Valid CRM Integration plan returns Ready status', () => {
      const validPlan = {
        name: 'crm_connect',
        displayName: 'CRM Connect',
        category: 'crm_integration',
        monthlyPrice: 2999,
        allowedBillingCycles: ['monthly', 'yearly'],
        permissionProfile: 'crm_connect',
        allowedPages: ['integration-dashboard', 'crm-connection'],
        isActive: true,
        isPublished: true
      };
      const result = validatePlanReadiness(validPlan);
      expect(result.status).toBe('Ready');
      expect(result.issues).toEqual([]);
    });

    test('Plan with missing display name or negative price returns Invalid status', () => {
      const invalidPlan = {
        name: 'bad_plan',
        displayName: '',
        category: 'kwickbot_crm',
        monthlyPrice: -500,
        allowedBillingCycles: ['monthly']
      };
      const result = validatePlanReadiness(invalidPlan);
      expect(result.status).toBe('Invalid');
      expect(result.issues.length).toBeGreaterThan(0);
    });

    test('CRM Integration plan without any CRM pages returns Warning status', () => {
      const mismatchedPlan = {
        name: 'crm_empty',
        displayName: 'CRM Empty',
        category: 'crm_integration',
        monthlyPrice: 1999,
        allowedBillingCycles: ['monthly'],
        permissionProfile: 'starter', // starter has no CRM pages
        allowedPages: ['dashboard', 'conversations'],
        isActive: true,
        isPublished: true
      };
      const result = validatePlanReadiness(mismatchedPlan);
      expect(result.status).toBe('Warning');
      expect(result.issues).toContain('Plan is categorized as CRM Integration, but does not include any CRM Integration pages.');
    });
  });
});

const { CANONICAL_PAGES, CANONICAL_PERMISSIONS } = require('../constants/permissions');
const { PERMISSION_PROFILES } = require('../constants/permissionProfiles');
const { withoutRetiredPages, withoutRetiredPermissions, withoutRetiredPlanSettings } = require('../constants/retiredCrmConfig');
const { resolveEffectivePermissions } = require('../services/permissionService');
const { validatePlanReadiness } = require('../services/planValidationService');

describe('retired CRM connector configuration', () => {
  test('old setup pages and permissions are no longer canonical', () => {
    expect(Object.values(CANONICAL_PAGES)).not.toContain('crm-connection');
    expect(Object.values(CANONICAL_PAGES)).not.toContain('field-mapping');
    expect(Object.values(CANONICAL_PERMISSIONS)).not.toContain('crmConnection.manage');
    expect(Object.values(CANONICAL_PERMISSIONS)).toContain('whatsappConnection.manage');
  });

  test('legacy plan settings are ignored while WhatsApp settings remain', () => {
    const original = {
      allowedPages: ['dashboard', 'crm-connection', 'whatsapp-connection'],
      features: { crmConnection: true, fieldMapping: true, whatsappConnection: true },
      usageLimits: { maxCrmConnections: 1, maxWhatsAppConnections: 1 }
    };
    const clean = withoutRetiredPlanSettings(original);
    expect(clean.allowedPages).toEqual(['dashboard', 'whatsapp-connection']);
    expect(clean.features).toEqual({ whatsappConnection: true });
    expect(clean.usageLimits).toEqual({ maxWhatsAppConnections: 1 });
    expect(original.allowedPages).toContain('crm-connection');
  });

  test('stored access overrides cannot restore retired pages', async () => {
    const result = await resolveEffectivePermissions({
      role: 'admin',
      subscriptionPlan: 'crm_connect',
      allowedPages: ['crm-connection', 'whatsapp-connection'],
      allowedPermissions: ['crmConnection.manage', 'whatsappConnection.view']
    });
    expect(result.pages).toContain('whatsapp-connection');
    expect(result.pages).not.toContain('crm-connection');
    expect(result.permissions).toContain('whatsappConnection.view');
    expect(result.permissions).not.toContain('crmConnection.manage');
  });

  test('retiring the connector does not require CRM pages to publish existing plan category', () => {
    const plan = {
      name: 'crm_connect',
      displayName: 'CRM Connect',
      category: 'crm_integration',
      monthlyPrice: 2499,
      allowedBillingCycles: ['monthly'],
      permissionProfile: 'crm_connect',
      allowedPages: ['dashboard', 'whatsapp-connection'],
      isActive: true,
      isPublished: true
    };
    expect(validatePlanReadiness(plan).status).toBe('Ready');
    expect(PERMISSION_PROFILES.crm_connect.pages).not.toContain('crm-connection');
    expect(withoutRetiredPages(['crm-connection', 'billing'])).toEqual(['billing']);
    expect(withoutRetiredPermissions(['crmConnection.view', 'billing.view'])).toEqual(['billing.view']);
  });
});

const mongoose = require('mongoose');
const { CANONICAL_PAGES, CANONICAL_PERMISSIONS } = require('../constants/permissions');
const { PERMISSION_PROFILES } = require('../constants/permissionProfiles');
const permissionService = require('../services/permissionService');
const { encryptCredential, decryptCredential, generateRandomSecret, generateHmacSignature } = require('../utils/cryptoUtil');
const { validateSSRF, isPrivateIPv4 } = require('../utils/ssrfValidator');
const CRMConnection = require('../models/CRMConnection');
const CRMFieldMapping = require('../models/CRMFieldMapping');
const AutomationRule = require('../models/AutomationRule');
const IntegrationEvent = require('../models/IntegrationEvent');
const WebhookEndpoint = require('../models/WebhookEndpoint');
const ApiUsageRecord = require('../models/ApiUsageRecord');
const crmProviderRegistry = require('../services/crmProviders/crmProviderRegistry');
const { registerEvent, calculateNextRetryDate, replayEvent } = require('../services/eventPipelineService');
const { recordUsage, getMonthlyUsageSummary } = require('../services/usageTrackerService');
const { requirePage, requirePermission, requireTenantOwnership, enforceUsageLimit } = require('../middleware/rbac');

describe('Backend Foundation for CRM Integration, WhatsApp API & Custom Automation', () => {


  describe('1. Canonical Page and Permission Keys', () => {
    test('Contains all required canonical CRM and WhatsApp API modules', () => {
      expect(CANONICAL_PAGES.INTEGRATION_DASHBOARD).toBe('integration-dashboard');
      expect(CANONICAL_PAGES.CRM_CONNECTION).toBe('crm-connection');
      expect(CANONICAL_PAGES.FIELD_MAPPING).toBe('field-mapping');
      expect(CANONICAL_PAGES.AUTOMATION_RULES).toBe('automation-rules');
      expect(CANONICAL_PAGES.API_DASHBOARD).toBe('api-dashboard');
      expect(CANONICAL_PAGES.API_KEYS).toBe('api-keys');
      expect(CANONICAL_PAGES.WEBHOOK_CONFIGURATION).toBe('webhook-configuration');
    });

    test('Contains all granular permission keys', () => {
      expect(CANONICAL_PERMISSIONS.CRM_CONNECTION_MANAGE).toBe('crmConnection.manage');
      expect(CANONICAL_PERMISSIONS.AUTOMATION_RULES_MANAGE).toBe('automationRules.manage');
      expect(CANONICAL_PERMISSIONS.FAILED_EVENTS_RETRY).toBe('failedEvents.retry');
      expect(CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_MANAGE).toBe('webhookConfiguration.manage');
      expect(CANONICAL_PERMISSIONS.FAILED_WEBHOOKS_RETRY).toBe('failedWebhooks.retry');
    });

    test('Permission profiles are correctly configured for each tier', () => {
      expect(PERMISSION_PROFILES.crm_connect.pages).toContain('crm-connection');
      expect(PERMISSION_PROFILES.crm_automation.pages).toContain('automation-rules');
      expect(PERMISSION_PROFILES.api_starter.pages).toContain('api-keys');
      expect(PERMISSION_PROFILES.api_growth.pages).toContain('failed-webhooks');
      expect(PERMISSION_PROFILES.custom_automation.pages).toEqual([]); // Deny by default
    });
  });

  describe('2. Effective Permission Resolver & Priority Chain', () => {
    test('Super Admin has unrestricted access to all pages and permissions', async () => {
      const superAdmin = { role: 'super_admin', email: 'super@kwickbot.in' };
      const { pages, permissions } = await permissionService.resolveEffectivePermissions(superAdmin);
      expect(pages).toContain('crm-connection');
      expect(pages).toContain('api-keys');
      expect(permissions).toContain(CANONICAL_PERMISSIONS.CRM_CONNECTION_MANAGE);
    });

    test('Existing legacy plan (e.g. growth) resolves standard allowed pages', async () => {
      const legacyMerchant = {
        role: 'admin',
        subscriptionPlan: 'growth',
        subscriptionStatus: 'active',
        isActive: true
      };
      const { pages } = await permissionService.resolveEffectivePermissions(legacyMerchant);
      expect(pages).toContain('conversations');
      expect(pages).toContain('broadcast');
      expect(pages).not.toContain('crm-connection');
    });

    test('Customer explicit ALLOW override grants additional page access', async () => {
      const merchantWithOverride = {
        role: 'admin',
        subscriptionPlan: 'starter',
        subscriptionStatus: 'active',
        isActive: true,
        allowedPages: ['crm-connection', 'custom-feature']
      };
      const { pages } = await permissionService.resolveEffectivePermissions(merchantWithOverride);
      expect(pages).toContain('crm-connection');
      expect(pages).toContain('custom-feature');
    });

    test('Customer explicit DENY override takes precedence and removes page access', async () => {
      const merchantWithDeny = {
        role: 'admin',
        subscriptionPlan: 'growth',
        subscriptionStatus: 'active',
        isActive: true,
        deniedPages: ['broadcast', 'analytics']
      };
      const { pages } = await permissionService.resolveEffectivePermissions(merchantWithDeny);
      expect(pages).toContain('conversations');
      expect(pages).not.toContain('broadcast');
      expect(pages).not.toContain('analytics');
    });

    test('Inactive or cancelled subscription rejects access with 402 status requirement', () => {
      const expiredMerchant = {
        role: 'admin',
        subscriptionPlan: 'growth',
        subscriptionStatus: 'inactive',
        isActive: true
      };
      const statusCheck = permissionService.validateAccountSubscription(expiredMerchant);
      expect(statusCheck.valid).toBe(false);
      expect(statusCheck.code).toBe('SUBSCRIPTION_INACTIVE');
    });
  });

  describe('3. Cryptographic Security & SSRF Protection', () => {
    test('Encrypts and decrypts credentials securely with AES-256-GCM', () => {
      const originalPayload = { apiKey: 'live_odoo_secret_key_12345', db: 'production_db' };
      const encrypted = encryptCredential(originalPayload);

      expect(typeof encrypted).toBe('string');
      expect(encrypted.startsWith('enc:v1:')).toBe(true);

      const decrypted = decryptCredential(encrypted);
      expect(decrypted).toEqual(originalPayload);
    });

    test('Generates cryptographically random webhook secrets', () => {
      const secret1 = generateRandomSecret(24);
      const secret2 = generateRandomSecret(24);
      expect(secret1).not.toEqual(secret2);
      expect(secret1.length).toBe(48); // hex format
    });

    test('Generates and verifies HMAC-SHA256 signatures for webhooks', () => {
      const payload = { event: 'lead.created', id: 'lead_99' };
      const secret = 'whsec_my_secret_key';
      const sig1 = generateHmacSignature(payload, secret);
      const sig2 = generateHmacSignature(payload, secret);
      const sigWrong = generateHmacSignature(payload, 'wrong_secret');

      expect(sig1).toBe(sig2);
      expect(sig1).not.toBe(sigWrong);
    });

    test('SSRF Validator blocks localhost, loopback, and private IP ranges', async () => {
      expect(isPrivateIPv4('127.0.0.1')).toBe(true);
      expect(isPrivateIPv4('10.0.0.1')).toBe(true);
      expect(isPrivateIPv4('192.168.1.1')).toBe(true);
      expect(isPrivateIPv4('172.20.0.1')).toBe(true);
      expect(isPrivateIPv4('169.254.169.254')).toBe(true);
      expect(isPrivateIPv4('8.8.8.8')).toBe(false);

      const localhostCheck = await validateSSRF('http://localhost:8069');
      expect(localhostCheck.isValid).toBe(false);

      const metadataCheck = await validateSSRF('http://169.254.169.254/latest/meta-data/');
      expect(metadataCheck.isValid).toBe(false);

      const validUrlCheck = await validateSSRF('https://example.com/api/webhook', { skipDns: true });
      expect(validUrlCheck.isValid).toBe(true);
      expect(validUrlCheck.sanitizedUrl).toBe('https://example.com/api/webhook');
    });
  });

  describe('4. CRM Connection & Model Tenant Isolation', () => {
    let testAdminId;
    let otherAdminId;
    let testConnection;

    beforeAll(() => {
      testAdminId = new mongoose.Types.ObjectId();
      otherAdminId = new mongoose.Types.ObjectId();
    });

    test('CRMConnection encrypts credentials and hides them from toJSON', () => {
      testConnection = new CRMConnection({
        adminId: testAdminId,
        provider: 'odoo',
        displayName: 'My Odoo ERP',
        baseUrl: 'https://odoo.mycompany.com',
        databaseName: 'main_db'
      });

      testConnection.setCredentials({ user: 'admin', apiKey: 'secret_rpc_password' });

      const json = testConnection.toJSON();
      expect(json.encryptedCredentials).toBeUndefined();
      expect(json.hasCredentials).toBe(true);
      expect(testConnection.getCredentials()).toEqual({ user: 'admin', apiKey: 'secret_rpc_password' });
    });

    test('CRMFieldMapping creates and validates with tenant scoping', () => {
      const mapping = new CRMFieldMapping({
        adminId: testAdminId,
        connectionId: new mongoose.Types.ObjectId(),
        entityType: 'lead',
        sourceField: 'phone',
        destinationField: 'partner_phone',
        transformation: 'trim',
        required: true
      });

      expect(mapping.entityType).toBe('lead');
      expect(mapping.adminId.toString()).toBe(testAdminId.toString());
      expect(mapping.transformation).toBe('trim');
    });

    test('AutomationRule stores triggers, conditions, and actions cleanly', () => {
      const rule = new AutomationRule({
        adminId: testAdminId,
        connectionId: new mongoose.Types.ObjectId(),
        name: 'Sync WhatsApp Lead to CRM',
        trigger: 'whatsapp_lead_received',
        conditions: [{ field: 'message', operator: 'contains', value: 'quote' }],
        actions: [{ type: 'sync_crm_lead', config: { priority: 'high' } }],
        status: 'active'
      });

      expect(rule.trigger).toBe('whatsapp_lead_received');
      expect(rule.actions[0].type).toBe('sync_crm_lead');
      expect(rule.name).toBe('Sync WhatsApp Lead to CRM');
    });
  });

  describe('5. Idempotency Pipeline, Usage Tracking & Event Replay', () => {
    let tenantId;

    beforeAll(() => {
      tenantId = new mongoose.Types.ObjectId();
    });

    test('Idempotency prevents duplicate integration event creation', async () => {
      const idempotencyKey = `idemp_${Date.now()}`;
      const mockEvent = {
        _id: new mongoose.Types.ObjectId(),
        adminId: tenantId,
        eventType: 'crm.lead.sync',
        idempotencyKey,
        status: 'pending'
      };

      jest.spyOn(IntegrationEvent, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockEvent);

      jest.spyOn(IntegrationEvent.prototype, 'save').mockResolvedValue(mockEvent);

      const res1 = await registerEvent({
        adminId: tenantId,
        eventType: 'crm.lead.sync',
        idempotencyKey,
        requestPayload: { leadName: 'John Doe' }
      });

      expect(res1.isDuplicate).toBe(false);

      const res2 = await registerEvent({
        adminId: tenantId,
        eventType: 'crm.lead.sync',
        idempotencyKey,
        requestPayload: { leadName: 'John Doe Duplicate' }
      });

      expect(res2.isDuplicate).toBe(true);
    });

    test('Exponential backoff calculates increasing retry delays', () => {
      const date0 = calculateNextRetryDate(0);
      const date1 = calculateNextRetryDate(1);
      const date2 = calculateNextRetryDate(2);

      expect(date1.getTime()).toBeGreaterThan(date0.getTime());
      expect(date2.getTime()).toBeGreaterThan(date1.getTime());
    });

    test('ReplayEvent resets failed event status to pending for retry execution', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const mockFailedEvent = {
        _id: eventId,
        adminId: tenantId,
        eventType: 'webhook.dispatch',
        status: 'failed',
        retryCount: 2,
        errorCode: 'TIMEOUT',
        errorMessageSanitized: 'Request timed out',
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(IntegrationEvent, 'findOne').mockResolvedValue(mockFailedEvent);

      const replayed = await replayEvent({ _id: tenantId, email: 'admin@test.com' }, eventId);
      expect(replayed.status).toBe('pending');
      expect(replayed.errorCode).toBeNull();
      expect(mockFailedEvent.save).toHaveBeenCalled();
    });

    test('UsageTracker records and summarizes monthly metric quantities', async () => {
      jest.spyOn(ApiUsageRecord.prototype, 'save').mockResolvedValue(true);
      jest.spyOn(ApiUsageRecord, 'aggregate').mockResolvedValue([
        { _id: 'api_requests', totalQuantity: 15, eventCount: 2 },
        { _id: 'webhook_deliveries', totalQuantity: 2, eventCount: 1 }
      ]);

      await recordUsage(tenantId, 'api_requests', 5);
      await recordUsage(tenantId, 'api_requests', 10);
      await recordUsage(tenantId, 'webhook_deliveries', 2);

      const summary = await getMonthlyUsageSummary(tenantId);
      expect(summary.api_requests).toBe(15);
      expect(summary.webhook_deliveries).toBe(2);
    });
  });

  describe('6. Generic CRM Provider Registry', () => {
    test('Registry contains standard provider adapters', () => {
      const list = crmProviderRegistry.listSupportedProviders();
      expect(list).toContain('odoo');
      expect(list).toContain('zoho');
      expect(list).toContain('salesforce');
      expect(list).toContain('hubspot');
      expect(list).toContain('custom');
    });

    test('Provider testConnection returns safe unconfigured response without fake success', async () => {
      const odoo = crmProviderRegistry.get('odoo');
      expect(odoo).toBeDefined();

      const result = await odoo.testConnection({ baseUrl: 'https://odoo.corp.com', databaseName: 'db' }, { apiKey: 'key' });
      expect(result.success).toBe(false);
      expect(result.code).toBe('ODOO_CONNECTOR_INITIALIZING');
    });
  });

  describe('7. Authorization Middleware & Error Handling', () => {
    test('requirePage denies access when page is missing with 403', async () => {
      const req = {
        admin: {
          role: 'admin',
          subscriptionPlan: 'starter',
          subscriptionStatus: 'active',
          isActive: true
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = requirePage('crm-connection');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('requirePage grants access when page is permitted with next()', async () => {
      const req = {
        admin: {
          role: 'admin',
          subscriptionPlan: 'crm_connect',
          subscriptionStatus: 'active',
          isActive: true
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const middleware = requirePage('crm-connection');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

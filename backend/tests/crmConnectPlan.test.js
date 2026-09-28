const mongoose = require('mongoose');

// Mock mongoose models so they don't buffer against disconnected MongoDB
jest.mock('../models/GlobalSettings', () => ({
  findOne: jest.fn().mockResolvedValue({ key: 'aiAutoResponseEnabled', value: true })
}));

jest.mock('../models/AILog', () => {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(true)
  }));
});

const Admin = require('../models/Admin');
const PricingPlan = require('../models/PricingPlan');
const Conversation = require('../models/Conversation');
const Escalation = require('../models/Escalation');
const Order = require('../models/Order');
const CRMConnection = require('../models/CRMConnection');
const IntegrationEvent = require('../models/IntegrationEvent');
const GlobalSettings = require('../models/GlobalSettings');
const permissionService = require('../services/permissionService');
const subscriptionService = require('../services/subscriptionService');
const aiService = require('../services/aiService');
const OdooProvider = require('../services/crmProviders/OdooProvider');
const crmProviderRegistry = require('../services/crmProviders/crmProviderRegistry');
const { registerEvent } = require('../services/eventPipelineService');
const { defaultPlans } = require('../scripts/migratePlansToStandard');

describe('CRM Connect Plan (₹2,499/mo) Dedicated Test Suite', () => {
  let odooProvider;

  beforeAll(() => {
    odooProvider = new OdooProvider();
    crmProviderRegistry.register('odoo', odooProvider);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    GlobalSettings.findOne.mockResolvedValue({ key: 'aiAutoResponseEnabled', value: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================================================
  // 1. Strict Plan Entitlements & Restricted Pages/Features
  // =========================================================================
  describe('1. crm_connect plan entitlements and restricted page/feature access', () => {
    test('verifies strict crm_connect configuration and limits', () => {
      const connectPlan = defaultPlans.find(p => p.name === 'crm_connect');
      expect(connectPlan).toBeDefined();
      expect(connectPlan.monthlyPrice).toBe(2499);
      expect(connectPlan.yearlyPrice).toBe(24990);
      expect(connectPlan.setupFee).toBe(0);
      expect(connectPlan.connectorMaintenanceFee).toBe(0);
      expect(connectPlan.category).toBe('crm_integration');

      // Strict Usage Limits
      expect(connectPlan.usageLimits.maxWhatsAppConnections).toBe(1);
      expect(connectPlan.usageLimits.maxCrmConnections).toBe(1);
      expect(connectPlan.usageLimits.monthlyConversations).toBe(2000);
      expect(connectPlan.usageLimits.monthlyMessages).toBe(10000);
      expect(connectPlan.usageLimits.geminiTokensPerMonth).toBe(50000);
      expect(connectPlan.usageLimits.logRetentionDays).toBe(30);
      expect(connectPlan.usageLimits.maxActiveAutomations).toBe(0);
      expect(connectPlan.usageLimits.maxApiKeys).toBe(0);

      // Exactly 13 Enabled Features
      const enabledFeatures = Object.keys(connectPlan.features).filter(k => connectPlan.features[k] === true);
      expect(enabledFeatures.sort()).toEqual([
        'aiAutomation',
        'contactSync',
        'conversations',
        'crmConnection',
        'dashboardAccess',
        'fieldMapping',
        'humanHandoff',
        'integrationLogs',
        'knowledgeBase',
        'leadSync',
        'orderStatusSync',
        'productLookup',
        'whatsappConnection'
      ].sort());

      // Explicitly Disabled Features
      expect(connectPlan.features.quotationCreation).toBe(false);
      expect(connectPlan.features.saleOrderCreation).toBe(false);
      expect(connectPlan.features.internalOrders).toBe(false);
      expect(connectPlan.features.internalInvoices).toBe(false);
      expect(connectPlan.features.internalLeads).toBe(false);
      expect(connectPlan.features.automationRules).toBe(false);
      expect(connectPlan.features.customWebhooks).toBe(false);
      expect(connectPlan.features.developerApi).toBe(false);
      expect(connectPlan.features.apiKeys).toBe(false);
      expect(connectPlan.features.failedEventReplay).toBe(false);
      expect(connectPlan.features.broadcasts).toBe(false);
      expect(connectPlan.features.advancedAnalytics).toBe(false);
      expect(connectPlan.features.customBranding).toBe(false);
      expect(connectPlan.features.prioritySupport).toBe(false);
      expect(connectPlan.features.dedicatedSupport).toBe(false);
      expect(connectPlan.features.customSla).toBe(false);

      // Exactly 9 Allowed Pages
      expect(connectPlan.allowedPages.sort()).toEqual([
        'billing',
        'conversations',
        'crm-connection',
        'field-mapping',
        'integration-dashboard',
        'integration-logs',
        'settings',
        'usage',
        'whatsapp-connection'
      ].sort());

      // Blocked / Restricted Pages
      const blockedPages = [
        'automation-rules',
        'failed-events',
        'api-keys',
        'developer-api',
        'webhook-configuration',
        'broadcast',
        'orders'
      ];
      blockedPages.forEach(p => {
        expect(connectPlan.allowedPages).not.toContain(p);
      });
    });

    test('enforces RBAC page permissions denying restricted routes for crm_connect tenant', async () => {
      const planDef = defaultPlans.find(p => p.name === 'crm_connect');
      const merchant = {
        _id: new mongoose.Types.ObjectId(),
        email: 'crm_merchant@example.com',
        role: 'admin',
        isActive: true,
        subscriptionPlan: 'crm_connect',
        pricingPlanId: new mongoose.Types.ObjectId(),
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      jest.spyOn(PricingPlan, 'findById').mockResolvedValue(planDef);
      jest.spyOn(PricingPlan, 'findOne').mockResolvedValue(planDef);

      // Allowed Pages (9 standard pages)
      expect(await permissionService.hasPageAccess(merchant, 'integration-dashboard')).toBe(true);
      expect(await permissionService.hasPageAccess(merchant, 'crm-connection')).toBe(true);
      expect(await permissionService.hasPageAccess(merchant, 'field-mapping')).toBe(true);
      expect(await permissionService.hasPageAccess(merchant, 'integration-logs')).toBe(true);
      expect(await permissionService.hasPageAccess(merchant, 'whatsapp-connection')).toBe(true);
      expect(await permissionService.hasPageAccess(merchant, 'conversations')).toBe(true);
      expect(await permissionService.hasPageAccess(merchant, 'usage')).toBe(true);
      expect(await permissionService.hasPageAccess(merchant, 'billing')).toBe(true);
      expect(await permissionService.hasPageAccess(merchant, 'settings')).toBe(true);

      // Blocked / Restricted Pages
      expect(await permissionService.hasPageAccess(merchant, 'automation-rules')).toBe(false);
      expect(await permissionService.hasPageAccess(merchant, 'failed-events')).toBe(false);
      expect(await permissionService.hasPageAccess(merchant, 'api-keys')).toBe(false);
      expect(await permissionService.hasPageAccess(merchant, 'developer-api')).toBe(false);
      expect(await permissionService.hasPageAccess(merchant, 'webhook-configuration')).toBe(false);
      expect(await permissionService.hasPageAccess(merchant, 'broadcast')).toBe(false);
      expect(await permissionService.hasPageAccess(merchant, 'orders')).toBe(false);
    });
  });

  // =========================================================================
  // 2. Inbound WhatsApp Enquiry Syncing to Odoo with Idempotency Protection
  // =========================================================================
  describe('2. Inbound WhatsApp enquiry syncing to Odoo as a lead with idempotency protection', () => {
    test('creates only a lead and deduplicates repeated dispatches idempotently', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const connection = new CRMConnection({
        _id: new mongoose.Types.ObjectId(),
        adminId,
        provider: 'odoo',
        displayName: 'My Odoo ERP',
        baseUrl: 'https://odoo-mock.test.local',
        databaseName: 'odoo_db',
        tenantIdentifier: 'admin@odoo.local',
        status: 'connected',
        isActive: true
      });
      connection.setCredentials({ apiKey: 'mock_api_key' });

      let leadCreatedCount = 0;

      jest.spyOn(odooProvider, 'executeKw').mockImplementation(async (conn, creds, model, method) => {
        if (model === 'res.partner' && method === 'search_read') {
          return [];
        }
        if (model === 'crm.lead' && method === 'search_read') {
          return leadCreatedCount > 0 ? [{ id: 202, name: 'WhatsApp Enquiry: Aarav Patel' }] : [];
        }
        if (model === 'crm.lead' && method === 'create') {
          leadCreatedCount++;
          return 202;
        }
        return [];
      });

      const customerPhone = '+919876543210';
      const customerName = 'Aarav Patel';
      const enquiryMessage = 'Interested in your enterprise consulting services.';
      const idempotencyKey = `odoo_lead_${adminId}_${customerPhone}_msg_001`;

      const registeredEvents = new Map();
      jest.spyOn(IntegrationEvent, 'findOne').mockImplementation(({ adminId: aId, idempotencyKey: key }) => {
        return Promise.resolve(registeredEvents.get(`${aId}::${key}`) || null);
      });
      jest.spyOn(IntegrationEvent.prototype, 'save').mockImplementation(function() {
        registeredEvents.set(`${this.adminId}::${this.idempotencyKey}`, this);
        return Promise.resolve(this);
      });

      // Dispatch 1: First inbound webhook / message
      const { event: event1, isDuplicate: isDup1 } = await registerEvent({
        adminId,
        connectionId: connection._id,
        provider: 'odoo',
        eventType: 'lead_sync',
        direction: 'outbound',
        idempotencyKey,
        requestPayload: { customerPhone, customerName, enquiryMessage }
      });
      expect(isDup1).toBe(false);

      const syncResult1 = await odooProvider.syncLead(connection, null, {
        customerPhone,
        customerName,
        enquiryMessage,
        idempotencyKey
      });

      expect(syncResult1.success).toBe(true);
      expect(syncResult1.leadId).toBe(202);
      expect(syncResult1.isNewLead).toBe(true);
      expect(syncResult1.linkedExistingContact).toBe(false);
      expect(leadCreatedCount).toBe(1);

      expect(odooProvider.executeKw).not.toHaveBeenCalledWith(
        expect.anything(), expect.anything(), 'res.partner', 'create', expect.anything(), expect.anything()
      );

      // Dispatch 2: Duplicate webhook delivery with identical idempotencyKey
      const { event: event2, isDuplicate: isDup2 } = await registerEvent({
        adminId,
        connectionId: connection._id,
        provider: 'odoo',
        eventType: 'lead_sync',
        direction: 'outbound',
        idempotencyKey,
        requestPayload: { customerPhone, customerName, enquiryMessage }
      });
      expect(isDup2).toBe(true);
      expect(event2).toBeDefined();
      expect(leadCreatedCount).toBe(1);

      // Dispatch 3: Direct call with existing lead detects existing lead
      const syncResult3 = await odooProvider.syncLead(connection, null, {
        customerPhone,
        customerName,
        enquiryMessage,
        idempotencyKey: 'different_key'
      });
      expect(syncResult3.success).toBe(true);
      expect(syncResult3.isNewLead).toBe(false);
      expect(leadCreatedCount).toBe(1);
    });
  });

  // =========================================================================
  // 3. Live Product Lookup Returning Only Safe Fields
  // =========================================================================
  describe('3. Live product lookup returning only safe fields', () => {
    test('exposes only public fields and filters out internal costs, supplier info, and margins', async () => {
      const connection = new CRMConnection({
        adminId: new mongoose.Types.ObjectId(),
        provider: 'odoo',
        displayName: 'Odoo Catalog',
        baseUrl: 'https://odoo-mock.test.local',
        databaseName: 'odoo_db',
        tenantIdentifier: 'user@odoo.local',
        status: 'connected'
      });
      connection.setCredentials({ apiKey: 'test_key' });

      jest.spyOn(odooProvider, 'executeKw').mockImplementation(async (conn, creds, model) => {
        if (model === 'product.template') {
          return [
            {
              id: 47,
              name: '24 Inch Monitor',
              display_name: '24 Inch Monitor [MON-24]',
              list_price: 12999,
              description_sale: 'Full HD IPS Display 75Hz',
              qty_available: 15,
              // Internal fields that MUST NOT leak:
              standard_price: 7500,
              seller_ids: [12, 14],
              margin: 5499,
              description: 'Vendor note: purchased in bulk at 40% discount',
              cost_currency_id: 1
            },
            {
              id: 48,
              name: 'Ergonomic Desk Chair',
              display_name: 'Ergonomic Desk Chair',
              list_price: 8499,
              description_sale: false,
              qty_available: 0,
              standard_price: 4200,
              seller_ids: [9]
            }
          ];
        }
        return [];
      });

      const safeProducts = await odooProvider.searchProducts(connection, null, 'Monitor');
      expect(safeProducts).toHaveLength(2);

      const monitor = safeProducts[0];
      expect(monitor.name).toBe('24 Inch Monitor');
      expect(monitor.price).toBe(12999);
      expect(monitor.description).toBe('Full HD IPS Display 75Hz');
      expect(monitor.availability).toBe('In Stock');
      expect(monitor.currency).toBe('INR');

      // Crucial Security Checks: Verify NO sensitive internals are exposed
      expect(monitor).not.toHaveProperty('standard_price');
      expect(monitor).not.toHaveProperty('seller_ids');
      expect(monitor).not.toHaveProperty('margin');
      expect(monitor).not.toHaveProperty('cost');
      expect(monitor).not.toHaveProperty('cost_currency_id');

      const chair = safeProducts[1];
      expect(chair.description).toBe('');
      expect(chair.availability).toBe('Available on order');
      expect(chair).not.toHaveProperty('standard_price');
    });
  });

  // =========================================================================
  // 4. Read-Only Order Status Check Verifying Customer Phone Ownership
  // =========================================================================
  describe('4. Read-only order status check verifying customer phone ownership', () => {
    test('returns order status when customer phone matches registered partner, and rejects mismatch', async () => {
      const connection = new CRMConnection({
        adminId: new mongoose.Types.ObjectId(),
        provider: 'odoo',
        displayName: 'Odoo Orders',
        baseUrl: 'https://odoo-mock.test.local',
        databaseName: 'odoo_db',
        tenantIdentifier: 'user@odoo.local',
        status: 'connected'
      });
      connection.setCredentials({ apiKey: 'test_key' });

      jest.spyOn(odooProvider, 'executeKw').mockImplementation(async (conn, creds, model) => {
        if (model === 'sale.order') {
          return [
            {
              id: 830,
              name: 'SO-1008',
              partner_id: [15, 'Rahul Sharma'],
              amount_total: 4999.0,
              state: 'sale',
              delivery_status: 'Processing',
              date_order: '2026-09-28T10:00:00Z',
              payment_term_id: [2, 'Immediate Payment'],
              account_payment_ids: ['pay_secret_token']
            }
          ];
        }
        if (model === 'res.partner') {
          return [
            {
              id: 15,
              name: 'Rahul Sharma',
              phone: '+919876543210',
              mobile: '+919876543210'
            }
          ];
        }
        return [];
      });

      // 1. Authorized lookup: Customer phone matches order partner phone
      const authorizedResult = await odooProvider.lookupOrderStatus(connection, null, {
        customerPhone: '+919876543210',
        orderRef: 'SO-1008'
      });

      expect(authorizedResult.success).toBe(true);
      expect(authorizedResult.verified).toBe(true);
      expect(authorizedResult.orderRef).toBe('SO-1008');
      expect(authorizedResult.displayStatus).toBe('Processing');
      expect(authorizedResult.totalAmount).toBe(4999.0);
      expect(authorizedResult).not.toHaveProperty('payment_term_id');
      expect(authorizedResult).not.toHaveProperty('account_payment_ids');

      // 2. Unauthorized lookup: Different phone number attempting to access order
      const unauthorizedResult = await odooProvider.lookupOrderStatus(connection, null, {
        customerPhone: '+918111122222',
        orderRef: 'SO-1008'
      });

      expect(unauthorizedResult.success).toBe(false);
      expect(unauthorizedResult.verified).toBe(false);
      expect(unauthorizedResult.error).toContain('verification failed');
    });
  });

  // =========================================================================
  // 5. Unsupported Action Triggers Live Chat Handoff and Leaves Order Untouched
  // =========================================================================
  describe('5. Attempting an unsupported action triggers Live Chat handoff and leaves order untouched', () => {
    test('routes cancellation/refund requests to Live Chat and leaves database order untouched', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const planDef = defaultPlans.find(p => p.name === 'crm_connect');

      const merchant = {
        _id: adminId,
        email: 'crm_handoff@example.com',
        role: 'admin',
        isActive: true,
        whatsappConnected: true,
        subscriptionPlan: 'crm_connect',
        pricingPlanId: new mongoose.Types.ObjectId(),
        subscriptionStatus: 'active',
        save: jest.fn().mockResolvedValue(true)
      };

      const conversation = {
        _id: new mongoose.Types.ObjectId(),
        customerPhone: '+919999988888',
        customerName: 'Kunal Shah',
        admin: adminId,
        messages: [],
        botPaused: false,
        status: 'active',
        escalated: false,
        save: jest.fn().mockResolvedValue(true)
      };

      const existingOrder = {
        _id: new mongoose.Types.ObjectId(),
        orderId: 'ORD-999',
        customerPhone: '+919999988888',
        customerName: 'Kunal Shah',
        totalAmount: 2499,
        status: 'shipped',
        admin: adminId,
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Admin, 'findById').mockResolvedValue(merchant);
      jest.spyOn(Admin, 'findOne').mockResolvedValue(merchant);
      jest.spyOn(PricingPlan, 'findById').mockResolvedValue(planDef);
      jest.spyOn(PricingPlan, 'findOne').mockResolvedValue(planDef);
      jest.spyOn(Conversation, 'findOne').mockResolvedValue(conversation);
      jest.spyOn(CRMConnection, 'findOne').mockResolvedValue(null);
      jest.spyOn(Order, 'findOne').mockResolvedValue(existingOrder);
      jest.spyOn(Order, 'find').mockResolvedValue([existingOrder]);
      jest.spyOn(Order, 'distinct').mockResolvedValue([]);
      jest.spyOn(aiService, 'detectProductInquiry').mockResolvedValue(null);
      jest.spyOn(Escalation, 'findOne').mockResolvedValue(null);

      const escalationSpy = jest.spyOn(Escalation, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        reason: 'unsupported_action_crm_connect',
        status: 'pending'
      });

      const customerPhone = '+919999988888';
      const customerName = 'Kunal Shah';
      const cancelMessage = 'I want to cancel my order ORD-999 and get a refund immediately';

      // Execute inbound message through aiService
      const result = await aiService.processMessage({
        customerPhone,
        customerName,
        message: cancelMessage,
        messageId: 'msg_cancel_test',
        adminId
      });

      // Assert bot is paused and conversation is escalated for Live Chat
      expect(result.botPaused).toBe(true);
      expect(result.escalated).toBe(true);
      expect(result.escalationReason).toBe('unsupported_action_crm_connect');
      expect(result.message).toContain('support team');

      // Assert an Escalation document was created for Live Chat agents
      expect(escalationSpy).toHaveBeenCalledWith(expect.objectContaining({
        reason: 'unsupported_action_crm_connect',
        customerPhone
      }));

      // Crucial Integrity Check: Order in database remains completely UNTOUCHED
      expect(existingOrder.status).toBe('shipped');
    });
  });

  // =========================================================================
  // 6. Monthly Gemini Token Cap Enforcement Triggering Bot Pause / Live Chat Routing
  // =========================================================================
  describe('6. Monthly Gemini token cap enforcement triggering bot pause / Live Chat routing', () => {
    test('pauses bot and escalates to Live Chat when 50,000 monthly Gemini tokens are reached', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const planDef = defaultPlans.find(p => p.name === 'crm_connect');

      const merchant = {
        _id: adminId,
        email: 'token_capped@example.com',
        role: 'admin',
        isActive: true,
        whatsappConnected: true,
        subscriptionPlan: 'crm_connect',
        pricingPlanId: new mongoose.Types.ObjectId(),
        subscriptionStatus: 'active',
        geminiTokensUsed: 50000, // Exactly at 50,000 token limit
        save: jest.fn().mockResolvedValue(true)
      };

      const conversation = {
        _id: new mongoose.Types.ObjectId(),
        customerPhone: '+919123456789',
        customerName: 'Pooja Verma',
        admin: adminId,
        messages: [],
        botPaused: false,
        status: 'active',
        escalated: false,
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Admin, 'findById').mockResolvedValue(merchant);
      jest.spyOn(Admin, 'findOne').mockResolvedValue(merchant);
      jest.spyOn(PricingPlan, 'findById').mockResolvedValue(planDef);
      jest.spyOn(PricingPlan, 'findOne').mockResolvedValue(planDef);
      jest.spyOn(Conversation, 'findOne').mockResolvedValue(conversation);
      jest.spyOn(CRMConnection, 'findOne').mockResolvedValue(null);
      jest.spyOn(Order, 'distinct').mockResolvedValue([]);
      jest.spyOn(aiService, 'detectProductInquiry').mockResolvedValue(null);
      jest.spyOn(Escalation, 'findOne').mockResolvedValue(null);

      const escalationSpy = jest.spyOn(Escalation, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        reason: 'token_limit_exceeded',
        status: 'pending'
      });

      // Verify limit check directly
      const limitCheck = await subscriptionService.checkLimitExceeded(merchant);
      expect(limitCheck.exceeded).toBe(true);
      expect(limitCheck.reason).toContain('AI token budget reached');

      // Send inbound customer message when tokens are exhausted
      const result = await aiService.processMessage({
        customerPhone: '+919123456789',
        customerName: 'Pooja Verma',
        message: 'What are your store hours?',
        messageId: 'msg_token_cap_test',
        adminId
      });

      // Verify bot paused and routed to Live Chat
      expect(result.botPaused).toBe(true);
      expect(result.limitExceeded).toBe(true);
      expect(result.escalated).toBe(true);
      expect(result.escalationReason).toBe('token_limit_exceeded');

      // Verify an Escalation was filed for Live Chat agents
      expect(escalationSpy).toHaveBeenCalledWith(expect.objectContaining({
        reason: 'token_limit_exceeded',
        customerPhone: '+919123456789'
      }));
    });
  });
});

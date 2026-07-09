const { handleExternalOrder } = require('../controllers/public/externalWebhookController');
const { toggleFeatureFlag, getFeatureFlags, getGlobalSettings, updateGlobalSettings } = require('../controllers/superAdmin/superAdminController');
const aiService = require('../services/aiService');
const GlobalSettings = require('../models/GlobalSettings');
const Conversation = require('../models/Conversation');
const Admin = require('../models/Admin');
const WebhookLog = require('../models/WebhookLog');
const AILog = require('../models/AILog');
const auditLogService = require('../services/auditLogService');

jest.mock('../models/GlobalSettings');
jest.mock('../models/Conversation');
jest.mock('../models/Admin');
jest.mock('../services/webhookService');
jest.mock('../services/auditLogService', () => {
  return {
    logAction: jest.fn().mockResolvedValue(true)
  };
});
jest.mock('../models/WebhookLog', () => {
  return jest.fn().mockImplementation(() => {
    return {
      save: jest.fn().mockResolvedValue(true)
    };
  });
});
jest.mock('../models/AILog', () => {
  return jest.fn().mockImplementation(() => {
    return {
      save: jest.fn().mockResolvedValue(true)
    };
  });
});

describe('Super Admin Feature Flags Backend Enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Global Settings Whitelisting & Sensitive Data Masking', () => {
    test('getGlobalSettings restricts lookup to whitelisted keys and masks sensitive values', async () => {
      // Simulate MongoDB only returning whitelisted keys in production
      const mockSettings = [
        { key: 'whatsapp_access_token', value: 'secret-token-value-123' },
        { key: 'whatsapp_phone_number_id', value: '1140434719159859' }
      ];
      GlobalSettings.find.mockResolvedValue(mockSettings);

      const req = {};
      const res = {
        json: jest.fn()
      };

      await getGlobalSettings(req, res);

      // Verify db query matches whitelist restriction
      expect(GlobalSettings.find).toHaveBeenCalledWith({
        key: {
          $in: [
            'whatsapp_access_token',
            'whatsapp_phone_number_id',
            'whatsapp_business_account_id',
            'whatsapp_webhook_verify_token',
            'razorpay_key_id',
            'razorpay_key_secret',
            'geminiApiFundsAdded',
            'webBotEnabled'
          ]
        }
      });

      // Verify that response excludes un-whitelisted keys and masks sensitive ones
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          whatsapp_access_token: '******',
          whatsapp_phone_number_id: '1140434719159859',
          webBotEnabled: false,
          geminiApiFundsAdded: 0
        })
      }));
      
      const responseData = res.json.mock.calls[0][0].data;
      expect(responseData.database_secret_credential).toBeUndefined();
    });

    test('updateGlobalSettings ignores masked values and only saves whitelisted settings keys', async () => {
      const req = {
        body: {
          settings: {
            whatsapp_access_token: '******', // masked, should be ignored
            whatsapp_phone_number_id: '99999999999', // safe, should be updated
            malicious_arbitrary_key: 'should-be-ignored' // not whitelisted, should be ignored
          }
        }
      };
      const res = {
        json: jest.fn()
      };

      GlobalSettings.findOneAndUpdate = jest.fn();

      await updateGlobalSettings(req, res);

      expect(GlobalSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'whatsapp_phone_number_id' },
        { key: 'whatsapp_phone_number_id', value: '99999999999' },
        expect.any(Object)
      );

      // Ensure masked and unwhitelisted values were not saved
      expect(GlobalSettings.findOneAndUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({ key: 'whatsapp_access_token' }),
        expect.any(Object),
        expect.any(Object)
      );
      expect(GlobalSettings.findOneAndUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({ key: 'malicious_arbitrary_key' }),
        expect.any(Object),
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });
  });

  describe('Feature Flags Security Whitelisting & Audit Logging', () => {
    test('getFeatureFlags queries only the predefined flags', async () => {
      GlobalSettings.find.mockResolvedValue([]);
      const req = {};
      const res = {
        json: jest.fn()
      };

      await getFeatureFlags(req, res);

      expect(GlobalSettings.find).toHaveBeenCalledWith({
        key: { $in: ['webBotEnabled', 'shopifySyncEnabled', 'wooSyncEnabled', 'aiAutoResponseEnabled'] }
      });
    });

    test('toggleFeatureFlag allows predefined flags and saves log to AuditLog', async () => {
      const mockAdmin = { _id: 'admin_123', email: 'super@admin.com' };
      const req = {
        body: { key: 'shopifySyncEnabled', isEnabled: true },
        admin: mockAdmin
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      GlobalSettings.findOne.mockResolvedValue({ key: 'shopifySyncEnabled', value: false });
      GlobalSettings.findOneAndUpdate.mockResolvedValue({ key: 'shopifySyncEnabled', value: true });

      await toggleFeatureFlag(req, res);

      expect(GlobalSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'shopifySyncEnabled' },
        { value: true },
        expect.any(Object)
      );
      expect(auditLogService.logAction).toHaveBeenCalledWith(expect.objectContaining({
        action: 'feature_flag_toggled',
        actor: mockAdmin,
        target: 'shopifySyncEnabled',
        details: {
          flag: 'shopifySyncEnabled',
          oldValue: false,
          newValue: true
        }
      }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true
      }));
    });

    test('toggleFeatureFlag blocks arbitrary keys with a 400 status code', async () => {
      const req = {
        body: { key: 'maliciousArbitrarySecret', isEnabled: true }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await toggleFeatureFlag(req, res);

      expect(GlobalSettings.findOneAndUpdate).not.toHaveBeenCalled();
      expect(auditLogService.logAction).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.stringContaining('Unauthorized key modification')
      }));
    });
  });

  describe('WooCommerce Webhook Flag (wooSyncEnabled)', () => {
    test('allows WooCommerce webhook processing when wooSyncEnabled is not disabled (true or missing)', async () => {
      GlobalSettings.findOne.mockResolvedValue(null);
      const req = {
        params: { source: 'woocommerce' },
        body: { id: 12345, status: 'completed' },
        adminId: 'admin_123'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const webhookService = require('../services/webhookService');
      webhookService.processWebhook.mockResolvedValue({
        order: { orderId: 'ORD-123', status: 'completed', customerPhone: '12345' },
        isUpdate: false,
        customer: { name: 'Samarth' }
      });
      webhookService.sendOrderConfirmation.mockResolvedValue({
        success: true
      });

      await handleExternalOrder(req, res);

      expect(webhookService.processWebhook).toHaveBeenCalledWith('woocommerce', req.body, 'admin_123');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('safely skips WooCommerce webhook processing when wooSyncEnabled is false', async () => {
      GlobalSettings.findOne.mockResolvedValue({ key: 'wooSyncEnabled', value: false });
      const req = {
        params: { source: 'woocommerce' },
        body: { id: 12345, status: 'completed' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await handleExternalOrder(req, res);

      const webhookService = require('../services/webhookService');
      expect(webhookService.processWebhook).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('WooCommerce sync is globally disabled')
      }));
    });
  });

  describe('AI Auto-Response Flag (aiAutoResponseEnabled)', () => {
    test('processes AI generation when aiAutoResponseEnabled is true or missing', async () => {
      GlobalSettings.findOne.mockImplementation((query) => {
        if (query.key === 'aiAutoResponseEnabled') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });
      
      const adminDoc = {
        _id: 'admin_123',
        email: 'test@store.com',
        whatsappConnected: true,
        subscriptionStatus: 'active',
        isActive: true,
        save: jest.fn().mockResolvedValue(true)
      };
      Admin.findOne.mockResolvedValue(adminDoc);
      
      const mockConvo = {
        _id: 'convo_123',
        messages: [],
        status: 'active',
        escalated: false,
        botPaused: false,
        save: jest.fn().mockResolvedValue(true)
      };
      Conversation.findOne.mockResolvedValue(mockConvo);

      aiService.validateInput = jest.fn().mockReturnValue({ valid: true });
      aiService.checkCustomerRateLimit = jest.fn().mockReturnValue({ allowed: true });
      aiService.detectIntent = jest.fn().mockReturnValue('general_inquiry');
      aiService.checkForEscalation = jest.fn().mockReturnValue(false);
      aiService.handleGeneralInquiry = jest.fn().mockResolvedValue({
        message: 'Hello Customer',
        usedAI: true,
        tokenUsage: { totalTokens: 10 }
      });

      const response = await aiService.processMessage({
        customerPhone: '919999999999',
        customerName: 'Samarth',
        message: 'Hello bot',
        messageId: 'msg_123',
        adminId: 'admin_123'
      });

      expect(aiService.handleGeneralInquiry).toHaveBeenCalled();
      expect(response.message).toContain('Hello Customer');
    });

    test('skips AI generation and returns botPaused with null message when aiAutoResponseEnabled is false', async () => {
      GlobalSettings.findOne.mockImplementation((query) => {
        if (query.key === 'aiAutoResponseEnabled') {
          return Promise.resolve({ key: 'aiAutoResponseEnabled', value: false });
        }
        return Promise.resolve(null);
      });

      const adminDoc = {
        _id: 'admin_123',
        email: 'test@store.com',
        whatsappConnected: true,
        subscriptionStatus: 'active',
        isActive: true,
        save: jest.fn().mockResolvedValue(true)
      };
      Admin.findOne.mockResolvedValue(adminDoc);
      
      const mockConvo = {
        _id: 'convo_123',
        messages: [],
        status: 'active',
        escalated: false,
        botPaused: false,
        save: jest.fn().mockResolvedValue(true)
      };
      Conversation.findOne.mockResolvedValue(mockConvo);

      aiService.validateInput = jest.fn().mockReturnValue({ valid: true });
      aiService.checkCustomerRateLimit = jest.fn().mockReturnValue({ allowed: true });
      aiService.detectIntent = jest.fn().mockReturnValue('general_inquiry');
      aiService.handleGeneralInquiry = jest.fn();

      const response = await aiService.processMessage({
        customerPhone: '919999999999',
        customerName: 'Samarth',
        message: 'Hello bot',
        messageId: 'msg_123',
        adminId: 'admin_123'
      });

      expect(aiService.handleGeneralInquiry).not.toHaveBeenCalled();
      expect(response.botPaused).toBe(true);
      expect(response.message).toBeNull();
    });
  });
});

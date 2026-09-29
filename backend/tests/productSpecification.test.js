const mongoose = require('mongoose');

jest.mock('../models/GlobalSettings', () => ({
  findOne: jest.fn().mockResolvedValue({ key: 'aiAutoResponseEnabled', value: true })
}));

jest.mock('../models/AILog', () => {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(true)
  }));
});

jest.mock('../services/eventPipelineService', () => ({
  registerEvent: jest.fn().mockResolvedValue({ event: { _id: 'mock_evt_id' }, isDuplicate: true }),
  markEventCompleted: jest.fn().mockResolvedValue(true),
  markEventFailed: jest.fn().mockResolvedValue(true)
}));

const Admin = require('../models/Admin');
const PricingPlan = require('../models/PricingPlan');
const Conversation = require('../models/Conversation');
const CRMConnection = require('../models/CRMConnection');
const Order = require('../models/Order');
const Escalation = require('../models/Escalation');
const aiService = require('../services/aiService');
const OdooProvider = require('../services/crmProviders/OdooProvider');
const crmProviderRegistry = require('../services/crmProviders/crmProviderRegistry');
const { defaultPlans } = require('../scripts/migratePlansToStandard');

describe('Product Specifications & User Handoff Removal Test Suite', () => {
  let odooProvider;

  beforeAll(() => {
    odooProvider = new OdooProvider();
    crmProviderRegistry.register('odoo', odooProvider);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Order, 'distinct').mockResolvedValue([]);
    jest.spyOn(Order, 'findOne').mockResolvedValue(null);
    jest.spyOn(Order, 'find').mockResolvedValue([]);
    jest.spyOn(Escalation, 'findOne').mockResolvedValue(null);
    jest.spyOn(Escalation, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1. detectIntent correctly identifies product specifications and feature inquiries', () => {
    expect(aiService.detectIntent('can you share specification about the business laptop 15 and what are the requirement for that , what is the futures about that')).toBe('faq_products');
    expect(aiService.detectIntent('what are the specifications of business laptop 15')).toBe('faq_products');
    expect(aiService.detectIntent('tell me the features of business smartphone')).toBe('faq_products');
    expect(aiService.detectIntent('what is the price of 24 inch monitor')).toBe('faq_products');
    expect(aiService.detectIntent('what product do you have ?')).toBe('faq_products');
  });

  test('2. processMessage resolves product specifications without any Talk to Agent buttons', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const planDef = defaultPlans.find(p => p.name === 'crm_connect');

    const merchant = {
      _id: adminId,
      email: 'chavdasamarth007@gmail.com',
      businessName: 'Studypoint Teams',
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
      customerPhone: '+918488880452',
      customerName: 'Samarth Chavda',
      admin: adminId,
      messages: [],
      botPaused: false,
      status: 'active',
      escalated: false,
      save: jest.fn().mockResolvedValue(true)
    };

    const connection = new CRMConnection({
      _id: new mongoose.Types.ObjectId(),
      adminId,
      provider: 'odoo',
      displayName: 'Odoo ERP',
      baseUrl: 'https://kwickbot.odoo.com',
      databaseName: 'kwickbot',
      status: 'connected',
      isActive: true
    });

    jest.spyOn(Admin, 'findById').mockResolvedValue(merchant);
    jest.spyOn(Admin, 'findOne').mockResolvedValue(merchant);
    jest.spyOn(PricingPlan, 'findById').mockResolvedValue(planDef);
    jest.spyOn(PricingPlan, 'findOne').mockResolvedValue(planDef);
    jest.spyOn(Conversation, 'findOne').mockResolvedValue(conversation);
    jest.spyOn(CRMConnection, 'findOne').mockResolvedValue(connection);

    // Mock searchProducts to return catalog with Business Laptop 15
    jest.spyOn(odooProvider, 'searchProducts').mockResolvedValue([
      {
        id: 42,
        name: 'Business Laptop 15',
        sku: 'PROD-0002',
        description: 'Demo product 2: Business Laptop 15',
        price: 3200,
        currency: 'INR',
        availability: 'Available on order'
      },
      {
        id: 41,
        name: '24 Inch Monitor',
        sku: 'PROD-0001',
        description: 'Demo product 1: 24 Inch Monitor',
        price: 12999,
        currency: 'INR',
        availability: 'Available on order'
      }
    ]);

    const inquiry = 'can you share specification about the business laptop 15 and what are the requirement for that , what is the futures about that';
    const result = await aiService.processMessage({
      customerPhone: '+918488880452',
      customerName: 'Samarth Chavda',
      message: inquiry,
      messageId: 'msg_spec_test',
      adminId
    });

    // Assert specifications are returned
    expect(result.message).toContain('Business Laptop 15');
    expect(result.message).toContain('3,200');
    expect(result.botPaused).toBe(false);
    expect(result.escalated).toBe(false);

    // Assert NO "Talk to Agent" or "👤 Talk to Agent" buttons
    if (result.buttons) {
      expect(result.buttons).not.toContain('👤 Talk to Agent');
      expect(result.buttons).not.toContain('Talk to Agent');
    }
  });

  test('3. agent_handoff does not pause bot or force human escalation', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const planDef = defaultPlans.find(p => p.name === 'crm_connect');

    const merchant = {
      _id: adminId,
      email: 'test@example.com',
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
      customerName: 'Customer',
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

    const result = await aiService.processMessage({
      customerPhone: '+919999988888',
      customerName: 'Customer',
      message: 'talk to agent',
      messageId: 'msg_agent_test',
      adminId
    });

    expect(result.botPaused).toBe(false);
    expect(result.escalated).toBe(false);
    expect(result.message).toContain('AI assistant');
    if (result.buttons) {
      expect(result.buttons).not.toContain('👤 Talk to Agent');
      expect(result.buttons).not.toContain('Talk to Agent');
    }
  });
});

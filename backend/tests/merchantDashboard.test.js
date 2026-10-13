jest.mock('../models/Order', () => ({ countDocuments: jest.fn() }));
jest.mock('../models/Conversation', () => ({ countDocuments: jest.fn(), find: jest.fn(), aggregate: jest.fn() }));
jest.mock('../models/Escalation', () => ({ countDocuments: jest.fn(), find: jest.fn() }));
jest.mock('../models/Broadcast', () => ({ find: jest.fn() }));
jest.mock('../services/permissionService', () => ({ getAdminPricingPlan: jest.fn() }));

const Order = require('../models/Order');
const Conversation = require('../models/Conversation');
const Escalation = require('../models/Escalation');
const Broadcast = require('../models/Broadcast');
const { getAdminPricingPlan } = require('../services/permissionService');
const { getDashboardStats } = require('../controllers/merchant/dashboardController');

const queryResult = (value) => ({
  sort: () => ({ limit: () => ({ select: () => ({ lean: () => Promise.resolve(value) }) }) })
});

describe('Merchant dashboard usage and tenant scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Order.countDocuments.mockResolvedValue(0);
    Conversation.countDocuments.mockResolvedValue(0);
    Escalation.countDocuments.mockResolvedValue(0);
    Conversation.find.mockImplementation(() => queryResult([]));
    Escalation.find.mockImplementation(() => queryResult([]));
    Broadcast.find.mockImplementation(() => queryResult([]));
    Conversation.aggregate.mockResolvedValue([]);
    getAdminPricingPlan.mockResolvedValue({
      displayName: 'CRM Automation',
      category: 'crm_integration',
      currency: 'INR',
      usageLimits: { monthlyConversations: 5000, monthlyMessages: 100000, maxBroadcastCampaigns: 5, maxBroadcastMessages: 5000 }
    });
  });

  test('uses authenticated merchant for every query and returns their own usage only', async () => {
    const admin = {
      _id: 'merchant-a', subscriptionPlan: 'crm_automation', billingCycle: 'monthly',
      subscriptionStatus: 'active', monthlyPrice: 6999, monthlyConversationsCount: 12,
      totalMessagesProcessed: 38, broadcastMessagesUsed: 55, broadcastCampaignsUsed: 2
    };
    const req = { admin };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

    await getDashboardStats(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(Order.countDocuments).toHaveBeenCalledWith({ admin: 'merchant-a' });
    expect(Conversation.countDocuments).toHaveBeenCalledWith({ admin: 'merchant-a' });
    expect(Escalation.countDocuments).toHaveBeenCalledWith({ admin: 'merchant-a' });
    expect(Conversation.find).toHaveBeenCalledWith({ admin: 'merchant-a' });
    expect(Escalation.find).toHaveBeenCalledWith({ admin: 'merchant-a' });
    expect(Broadcast.find).toHaveBeenCalledWith({ admin: 'merchant-a' });
    for (const [pipeline] of Conversation.aggregate.mock.calls) {
      expect(pipeline[0].$match.admin).toBe('merchant-a');
    }
    expect(res.json.mock.calls[0][0].usage).toMatchObject({
      planName: 'CRM Automation', conversations: 12, aiRepliesProcessed: 38,
      broadcastMessagesSent: 55, broadcastCampaignsCreated: 2,
      charges: { configuredMonthlyRate: 6999, metaActual: null }
    });
  });

  test('does not reuse one merchant usage for another merchant', async () => {
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await getDashboardStats({ admin: { _id: 'merchant-b', monthlyPrice: 2499, totalMessagesProcessed: 3 } }, res);
    const usage = res.json.mock.calls[0][0].usage;
    expect(usage.aiRepliesProcessed).toBe(3);
    expect(usage.broadcastMessagesSent).toBe(0);
    expect(usage.charges.configuredMonthlyRate).toBe(2499);
    expect(Broadcast.find).toHaveBeenCalledWith({ admin: 'merchant-b' });
  });
});

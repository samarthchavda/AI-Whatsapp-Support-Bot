const planCache = require('../services/planCache');
const PricingPlan = require('../models/PricingPlan');
const { checkLimitExceededDynamic, getPlanLimit } = require('../services/subscriptionService');

jest.mock('../models/PricingPlan');

describe('AI replies per month plan quota & top-up enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('enforces dynamic maxAiRepliesPerMonth set by Super Admin in planCache & DB', async () => {
    const growthPlan = {
      name: 'growth',
      category: 'kwickbot_crm',
      usageLimits: {
        monthlyConversations: -1,
        monthlyMessages: -1,
        maxAiRepliesPerMonth: 5000,
        geminiTokensPerMonth: -1
      },
      features: {
        aiAutomation: true,
        aiTopupAvailable: true
      }
    };

    planCache.__setCacheForTests([growthPlan]);
    PricingPlan.findOne.mockResolvedValue(growthPlan);

    expect(getPlanLimit('growth', 'maxAiRepliesPerMonth')).toBe(5000);

    const under = await checkLimitExceededDynamic({
      isActive: true,
      subscriptionPlan: 'growth',
      subscriptionStatus: 'active',
      totalMessagesProcessed: 4999,
      monthlyConversationsCount: 100,
      geminiTokensUsed: 500000
    });
    expect(under.exceeded).toBe(false);

    const reached = await checkLimitExceededDynamic({
      isActive: true,
      subscriptionPlan: 'growth',
      subscriptionStatus: 'active',
      totalMessagesProcessed: 5000,
      monthlyConversationsCount: 100,
      geminiTokensUsed: 500000
    });
    expect(reached.exceeded).toBe(true);
    expect(reached.reason).toMatch(/5,000\/5,000 replies/);
    expect(reached.reason).toMatch(/Top-up available/);
  });

  test('updates limit dynamically if Super Admin increases Growth AI replies to 8000', async () => {
    const updatedPlan = {
      name: 'growth',
      category: 'kwickbot_crm',
      usageLimits: {
        monthlyConversations: -1,
        monthlyMessages: -1,
        maxAiRepliesPerMonth: 8000,
        geminiTokensPerMonth: -1
      },
      features: {
        aiAutomation: true,
        aiTopupAvailable: true
      }
    };

    planCache.__setCacheForTests([updatedPlan]);
    PricingPlan.findOne.mockResolvedValue(updatedPlan);

    const check = await checkLimitExceededDynamic({
      isActive: true,
      subscriptionPlan: 'growth',
      subscriptionStatus: 'active',
      totalMessagesProcessed: 5500,
      monthlyConversationsCount: 100
    });
    expect(check.exceeded).toBe(false);
  });
});

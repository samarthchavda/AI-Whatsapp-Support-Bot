const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const AILog = require('../models/AILog');
const Invoice = require('../models/Invoice');
const GlobalSettings = require('../models/GlobalSettings');
const {
  computeTokenCostUsd,
  getRangeWindow,
  getSuperAdminAiBudget
} = require('../services/aiCostAnalyticsService');

describe('AI Cost Analytics Service (Super Admin Budget)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('computeTokenCostUsd calculates input/output cost accurately for Gemini and OpenAI models', () => {
    // 1,000,000 input ($0.15) + 1,000,000 output ($0.60) = $0.75
    expect(computeTokenCostUsd({
      aiModel: 'gemini-2.5-flash',
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
      totalTokens: 2_000_000
    })).toBeCloseTo(0.75, 6);

    // Non-AI / rule-based logs cost $0
    expect(computeTokenCostUsd({
      aiModel: 'none',
      promptTokens: 5000,
      completionTokens: 5000,
      totalTokens: 10000
    })).toBe(0);

    // Fallback 70/30 split when only totalTokens is recorded
    expect(computeTokenCostUsd({
      aiModel: 'gemini-2.5-flash',
      totalTokens: 1_000_000
    })).toBeCloseTo((0.7 * 0.15) + (0.3 * 0.60), 6);
  });

  test('getRangeWindow resolves this_month, last_30_days, and all_time accurately', () => {
    const fixedNow = new Date('2026-11-25T10:00:00.000Z');
    const monthWin = getRangeWindow('this_month', fixedNow);
    expect(monthWin.startDate.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(monthWin.endDate).toBe(fixedNow);

    const thirtyWin = getRangeWindow('last_30_days', fixedNow);
    expect(thirtyWin.endDate.getTime() - thirtyWin.startDate.getTime()).toBe(30 * 24 * 60 * 60 * 1000);

    const allWin = getRangeWindow('all_time', fixedNow);
    expect(allWin.startDate).toBeNull();
  });

  test('getSuperAdminAiBudget aggregates real AILog spend, paid Invoice revenue, and per-merchant margin', async () => {
    const merchantAId = new mongoose.Types.ObjectId();
    const merchantBId = new mongoose.Types.ObjectId();
    const now = new Date('2026-11-25T10:00:00.000Z');

    jest.spyOn(Admin, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: merchantAId,
            name: 'Alice Store',
            email: 'alice@store.test',
            businessName: 'Alice Boutique',
            subscriptionPlan: 'starter',
            subscriptionStatus: 'active',
            geminiTokensUsed: 45000,
            geminiTokensLimit: 50000
          },
          {
            _id: merchantBId,
            name: 'Bob Store',
            email: 'bob@store.test',
            businessName: 'Bob Goods',
            subscriptionPlan: 'growth',
            subscriptionStatus: 'active',
            geminiTokensUsed: 120000,
            geminiTokensLimit: -1
          }
        ])
      })
    });

    jest.spyOn(AILog, 'aggregate')
      .mockResolvedValueOnce([
        {
          _id: { admin: merchantAId, aiModel: 'gemini-2.5-flash' },
          promptTokens: 1_000_000,
          completionTokens: 500_000,
          totalTokens: 1_500_000,
          calls: 25
        },
        {
          _id: { admin: merchantBId, aiModel: 'none' },
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          calls: 10
        }
      ])
      .mockResolvedValueOnce([
        {
          _id: { day: '2026-11-25', aiModel: 'gemini-2.5-flash' },
          promptTokens: 1_000_000,
          completionTokens: 500_000,
          totalTokens: 1_500_000,
          calls: 25
        }
      ]);

    jest.spyOn(Invoice, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { customerId: merchantAId, totalAmount: 1299 },
          { customerId: merchantBId, totalAmount: 2999 }
        ])
      })
    });

    jest.spyOn(Invoice, 'aggregate').mockResolvedValue([
      { _id: '2026-11-25', revenueInr: 4298, invoices: 2 }
    ]);

    jest.spyOn(GlobalSettings, 'findOne').mockReturnValue({
      lean: jest.fn().mockResolvedValue({ key: 'geminiApiFundsAdded', value: 10 })
    });

    const report = await getSuperAdminAiBudget({ range: 'this_month', now });

    // 1M * $0.15 + 0.5M * $0.60 = $0.45 -> ₹38.25 at 85 INR/USD
    expect(report.summary.totalCostUsd).toBe(0.45);
    expect(report.summary.totalCostInr).toBe(38.25);
    expect(report.summary.totalRevenueInr).toBe(4298);
    expect(report.summary.netMarginInr).toBe(4259.75);
    expect(report.summary.totalTokens).toBe(1_500_000);
    expect(report.summary.totalAiCalls).toBe(35);
    expect(report.monthlyBudgetUsd).toBe(10);
    expect(report.dailyTrend).toHaveLength(7);

    const alice = report.merchants.find((m) => String(m._id) === String(merchantAId));
    expect(alice.quotaStatus).toBe('Near Limit');
    expect(alice.costUsd).toBe(0.45);
    expect(alice.revenueInr).toBe(1299);

    const bob = report.merchants.find((m) => String(m._id) === String(merchantBId));
    expect(bob.quotaStatus).toBe('Unlimited');
    expect(bob.costUsd).toBe(0);
    expect(bob.revenueInr).toBe(2999);
  });
});

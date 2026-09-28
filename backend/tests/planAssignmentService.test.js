const mongoose = require('mongoose');
const PricingPlan = require('../models/PricingPlan');
const {
  calculateMonthlyPrice,
  calculateSubscriptionWindow,
  resolvePlanAssignment
} = require('../services/planAssignmentService');

describe('Plan assignment service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('uses the annual plan total to calculate the stored monthly equivalent', () => {
    expect(calculateMonthlyPrice({ monthlyPrice: 2999, yearlyPrice: 29990 }, 'yearly')).toBe(2499.17);
    expect(calculateMonthlyPrice({ monthlyPrice: 2999, yearlyPrice: null }, 'yearly')).toBe(2999);
  });

  test('creates the correct trial and yearly subscription windows', () => {
    const now = new Date('2026-09-28T00:00:00.000Z');
    const trial = calculateSubscriptionWindow({ status: 'trial', billingCycle: 'monthly', trialDays: 21, now });
    const yearly = calculateSubscriptionWindow({ status: 'active', billingCycle: 'yearly', now });

    expect(trial.endDate.toISOString()).toBe('2026-10-19T00:00:00.000Z');
    expect(yearly.endDate.toISOString()).toBe('2027-09-28T00:00:00.000Z');
  });

  test('resolves price, token limit, billing cycle, and plan reference from the selected database plan', async () => {
    const planId = new mongoose.Types.ObjectId();
    jest.spyOn(PricingPlan, 'findOne').mockResolvedValue({
      _id: planId,
      name: 'crm_automation',
      monthlyPrice: 6999,
      yearlyPrice: 69990,
      allowedBillingCycles: ['monthly', 'yearly'],
      usageLimits: { geminiTokensPerMonth: 350000 },
      trialDays: 14,
      contactSales: false,
      customPricing: false
    });

    const result = await resolvePlanAssignment({
      pricingPlanId: planId.toString(),
      billingCycle: 'yearly',
      subscriptionStatus: 'active',
      monthlyPrice: 1,
      geminiTokensLimit: 1
    });

    expect(result.pricingPlanId).toEqual(planId);
    expect(result.subscriptionPlan).toBe('crm_automation');
    expect(result.billingCycle).toBe('yearly');
    expect(result.monthlyPrice).toBe(5832.5);
    expect(result.geminiTokensLimit).toBe(350000);
    expect(result.subscriptionEndDate).toBeInstanceOf(Date);
  });

  test('allows an explicit negotiated price only when authorized by the assignment payload', async () => {
    const planId = new mongoose.Types.ObjectId();
    jest.spyOn(PricingPlan, 'findOne').mockResolvedValue({
      _id: planId,
      name: 'api_growth',
      monthlyPrice: 4999,
      yearlyPrice: 49990,
      allowedBillingCycles: ['monthly', 'yearly'],
      usageLimits: { geminiTokensPerMonth: 200000 },
      contactSales: false,
      customPricing: false
    });

    const result = await resolvePlanAssignment({
      pricingPlanId: planId.toString(),
      billingCycle: 'monthly',
      monthlyPrice: 4200,
      customPriceEnabled: true
    });

    expect(result.monthlyPrice).toBe(4200);
  });

  test('rejects an inactive or missing selected plan', async () => {
    jest.spyOn(PricingPlan, 'findOne').mockResolvedValue(null);

    await expect(resolvePlanAssignment({
      pricingPlanId: new mongoose.Types.ObjectId().toString()
    })).rejects.toMatchObject({ statusCode: 400 });
  });
});

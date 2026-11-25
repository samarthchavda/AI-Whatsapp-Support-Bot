jest.mock('../src/models', () => ({
  PricingPlan: {
    find: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve([{ name: 'growth' }, { name: 'starter' }]) }) })),
    findOne: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve(null) }) }))
  },
  Admin: { countDocuments: jest.fn(() => Promise.resolve(0)) },
  Coupon: {},
  AuditLog: {}
}));

const { buildCouponData } = require('../src/routes/coupons');
const { buildPlanFields, readiness } = require('../src/routes/plans');
const { Admin } = require('../src/models');

describe('coupon input', () => {
  test('a valid percent coupon', async () => {
    const { data, error } = await buildCouponData({ code: 'save20', discountPercent: 20, appliesToPlans: ['Growth'], showOnWebsite: true });
    expect(error).toBeUndefined();
    expect(data).toMatchObject({ kind: 'coupon', code: 'SAVE20', discountType: 'percent', discountPercent: 20, appliesToPlans: ['growth'], perMerchantLimit: 1, showOnWebsite: true });
  });

  test('offers get a generated code and need a name', async () => {
    expect((await buildCouponData({ kind: 'offer', discountPercent: 10 })).error).toMatch('name');
    const { data } = await buildCouponData({ kind: 'offer', name: 'Diwali', discountType: 'fixed', amountOff: 500 });
    expect(data.code).toMatch(/^OFFER-[0-9A-F]{6}$/);
    expect(data.amountOff).toBe(500);
  });

  test.each([
    [{ code: 'AB', discountPercent: 10 }, 'Coupon code'],
    [{ code: 'GOOD1', discountPercent: 0 }, '1% and 100%'],
    [{ code: 'GOOD1', discountType: 'fixed', amountOff: 0 }, 'at least ₹1'],
    [{ code: 'GOOD1', discountPercent: 10, appliesToPlans: ['nope'] }, 'Unknown plan'],
    [{ code: 'GOOD1', discountPercent: 10, startsAt: '2026-12-10', expiresAt: '2026-12-01' }, 'end date'],
    [{ code: 'GOOD1', discountPercent: 10, maxRedemptions: -3 }, 'Usage limits']
  ])('refuses bad input %#', async (body, message) => {
    expect((await buildCouponData(body)).error).toMatch(message);
  });
});

describe('plan input', () => {
  test('a new plan gets a name, slug and every feature and limit', async () => {
    const { fields, error } = await buildPlanFields({ displayName: 'Growth Plus', monthlyPrice: '1999', yearlyPrice: '19990' });
    expect(error).toBeUndefined();
    expect(fields).toMatchObject({ name: 'growth_plus', slug: 'growth-plus', monthlyPrice: 1999, yearlyPrice: 19990, isPublished: false });
    expect(Object.keys(fields.features)).toHaveLength(26);
    expect(fields.usageLimits.maxAiRepliesPerMonth).toBe(2000);
    expect(fields.usageLimits.geminiTokensPerMonth).toBe(50000);
  });

  test.each([
    [{ displayName: '' }, 'Plan name'],
    [{ displayName: 'X', monthlyPrice: -1 }, '0 or more'],
    [{ displayName: 'X', allowedBillingCycles: [] }, 'billing option'],
    [{ displayName: 'X', trialEnabled: true, trialDays: 0 }, 'Trial'],
    [{ displayName: 'X', usageLimits: { maxKbUploads: -5 } }, 'maxKbUploads'],
    [{ displayName: 'X', category: 'nope' }, 'Unknown plan type']
  ])('refuses bad input %#', async (body, message) => {
    expect((await buildPlanFields(body)).error).toMatch(message);
  });

  test("a plan's internal name can't change while merchants use it", async () => {
    Admin.countDocuments.mockResolvedValueOnce(3);
    const { error } = await buildPlanFields({ displayName: 'Growth', name: 'growth_new' }, { _id: 'p1', name: 'growth', displayName: 'Growth' });
    expect(error).toMatch('can no longer change');
  });

  test('unlimited (-1) limits are allowed', async () => {
    const { fields } = await buildPlanFields({ displayName: 'Max', usageLimits: { monthlyConversations: -1 } });
    expect(fields.usageLimits.monthlyConversations).toBe(-1);
  });

  test('readiness flags problems', () => {
    expect(readiness({ monthlyPrice: 0, allowedBillingCycles: ['monthly'], permissionProfile: 'growth' }).status).toBe('Invalid');
    expect(readiness({ monthlyPrice: 100, yearlyPrice: 1500, allowedBillingCycles: ['monthly'], permissionProfile: 'growth' }).issues[0]).toMatch('Yearly');
    expect(readiness({ monthlyPrice: 100, allowedBillingCycles: ['monthly'], allowedPages: ['orders'], isActive: true }).status).toBe('Ready');
  });
});

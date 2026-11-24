const mockCoupons = [];
const mockInvoices = [];

jest.mock('../src/models', () => ({
  Coupon: {
    findOne: jest.fn((query) => ({
      lean: () => Promise.resolve(mockCoupons.find((c) => c.code === query.code && (query.kind?.$ne ? c.kind !== query.kind.$ne : true)) || null)
    })),
    find: jest.fn((query) => ({
      lean: () => Promise.resolve(mockCoupons.filter((c) => Object.entries(query).every(([k, v]) => c[k] === v)))
    })),
    updateOne: jest.fn(() => Promise.resolve())
  },
  Invoice: {
    exists: jest.fn((q) => Promise.resolve(mockInvoices.some((i) => String(i.customerId) === String(q.customerId) && i.status === 'paid'))),
    countDocuments: jest.fn((q) => Promise.resolve(mockInvoices.filter((i) => String(i.customerId) === String(q.customerId) && i.status === 'paid' && i.couponCode === q.couponCode).length))
  }
}));

const { quote, discountAmount, staticIneligibility, websitePromotions } = require('../src/services/pricing');

const growth = { name: 'growth', monthlyPrice: 2499, yearlyPrice: 24990, setupFee: 0 };
const crm = { name: 'crm_connect', monthlyPrice: 1299, yearlyPrice: 12000, setupFee: 499 };
const merchant = { _id: 'm1', customDiscount: 0 };
const coupon = (over = {}) => ({ kind: 'coupon', code: 'SAVE20', discountType: 'percent', discountPercent: 20, isActive: true, redemptionCount: 0, ...over });

beforeEach(() => {
  mockCoupons.length = 0;
  mockInvoices.length = 0;
});

describe('plan price quotes', () => {
  test('no discount: plan price plus setup fee', async () => {
    const q = await quote({ plan: crm, cycle: 'monthly', admin: merchant });
    expect(q).toMatchObject({ planPrice: 1299, setupFee: 499, subtotal: 1798, total: 1798, discount: null });
  });

  test('a percent coupon comes off the plan price, not the setup fee', async () => {
    mockCoupons.push(coupon());
    const q = await quote({ plan: crm, cycle: 'monthly', couponCode: 'save20', admin: merchant });
    expect(q.discount).toMatchObject({ source: 'coupon', code: 'SAVE20', amount: 259.8 });
    expect(q.total).toBe(1538.2);
  });

  test('a fixed coupon never takes more than the plan price', async () => {
    mockCoupons.push(coupon({ code: 'BIG', discountType: 'fixed', amountOff: 5000, discountPercent: undefined }));
    const q = await quote({ plan: crm, cycle: 'monthly', couponCode: 'BIG', admin: merchant });
    expect(q.discount.amount).toBe(1299);
    expect(q.total).toBe(499);
  });

  test('yearly billing uses the yearly price', async () => {
    const q = await quote({ plan: growth, cycle: 'yearly', admin: merchant });
    expect(q.planPrice).toBe(24990);
  });

  test('only the single best discount applies: coupon, offer or personal discount', async () => {
    mockCoupons.push(coupon({ discountPercent: 10 }));
    mockCoupons.push(coupon({ kind: 'offer', code: 'OFFER-1', name: 'Diwali offer', discountPercent: 25 }));
    const q = await quote({ plan: growth, cycle: 'monthly', couponCode: 'SAVE20', admin: { _id: 'm1', customDiscount: 15 } });
    expect(q.discount).toMatchObject({ source: 'offer', label: 'Diwali offer', amount: 624.75 });
    expect(q.total).toBe(1874.25);
  });

  test("the merchant's personal discount from Super Admin is applied at checkout", async () => {
    const q = await quote({ plan: growth, cycle: 'monthly', admin: { _id: 'm1', customDiscount: 20 } });
    expect(q.discount).toMatchObject({ source: 'merchant', amount: 499.8 });
  });

  test('an older coupon with only code and percent still works', async () => {
    mockCoupons.push({ code: 'OLD10', discountPercent: 10, isActive: true });
    const q = await quote({ plan: growth, cycle: 'monthly', couponCode: 'OLD10', admin: merchant });
    expect(q.discount.amount).toBe(249.9);
  });
});

describe('coupon rules', () => {
  const now = new Date('2026-11-24T10:00:00Z');

  test.each([
    ['inactive', { isActive: false }, 'no longer active'],
    ['not started', { startsAt: new Date('2026-12-01') }, 'not active yet'],
    ['expired', { expiresAt: new Date('2026-11-01') }, 'expired'],
    ['used up', { maxRedemptions: 5, redemptionCount: 5 }, 'fully used'],
    ['other plan', { appliesToPlans: ['starter'] }, 'does not apply to the selected plan'],
    ['other cycle', { billingCycles: ['yearly'] }, 'monthly billing']
  ])('%s coupon is refused', (_, over, message) => {
    expect(staticIneligibility(coupon(over), { plan: growth, cycle: 'monthly', now })).toMatch(message);
  });

  test('an eligible coupon passes', () => {
    expect(staticIneligibility(coupon({ appliesToPlans: ['growth'], billingCycles: ['monthly'], expiresAt: new Date('2026-12-31') }), { plan: growth, cycle: 'monthly', now })).toBeNull();
  });

  test('an unknown coupon code returns an error and full price', async () => {
    const q = await quote({ plan: growth, cycle: 'monthly', couponCode: 'NOPE', admin: merchant });
    expect(q.couponError).toBe('Invalid coupon code');
    expect(q.total).toBe(2499);
  });

  test('first-purchase coupons are refused for merchants who paid before', async () => {
    mockCoupons.push(coupon({ firstPurchaseOnly: true }));
    mockInvoices.push({ customerId: 'm1', status: 'paid', couponCode: '' });
    const q = await quote({ plan: growth, cycle: 'monthly', couponCode: 'SAVE20', admin: merchant });
    expect(q.couponError).toMatch('first purchase');
  });

  test('per-merchant limit counts earlier paid invoices with the code', async () => {
    mockCoupons.push(coupon({ perMerchantLimit: 1 }));
    mockInvoices.push({ customerId: 'm1', status: 'paid', couponCode: 'SAVE20' });
    const q = await quote({ plan: growth, cycle: 'monthly', couponCode: 'SAVE20', admin: merchant });
    expect(q.couponError).toMatch('already used');
  });

  test('offers are never accepted as typed coupon codes', async () => {
    mockCoupons.push(coupon({ kind: 'offer', code: 'OFFER-1' }));
    const q = await quote({ plan: growth, cycle: 'monthly', couponCode: 'OFFER-1', admin: merchant });
    expect(q.couponError).toBe('Invalid coupon code');
  });

  test('discount amounts round to paise', () => {
    expect(discountAmount({ discountType: 'percent', discountPercent: 33 }, 1499)).toBe(494.67);
  });
});

describe('website banner', () => {
  test('only running coupons and offers marked "Show on website" appear', async () => {
    mockCoupons.push(coupon({ code: 'PUBLIC20', showOnWebsite: true, appliesToPlans: ['growth'] }));
    mockCoupons.push(coupon({ code: 'PRIVATE10', showOnWebsite: false }));
    mockCoupons.push(coupon({ code: 'OLD', showOnWebsite: true, expiresAt: new Date('2020-01-01') }));
    mockCoupons.push(coupon({ kind: 'offer', code: 'OFFER-1', name: 'Diwali offer', discountType: 'fixed', amountOff: 500, discountPercent: undefined, showOnWebsite: true }));
    const items = await websitePromotions([{ name: 'growth', displayName: 'Growth' }]);
    expect(items.map((i) => i.text)).toEqual([
      'Use code PUBLIC20 to get 20% off Growth',
      'Diwali offer: ₹500 off any plan, no code needed'
    ]);
    expect(items[1].code).toBeNull();
  });

  test('custom banner text wins', async () => {
    mockCoupons.push(coupon({ code: 'FEST', showOnWebsite: true, bannerText: 'Festive sale: use FEST for 20% off' }));
    const items = await websitePromotions([]);
    expect(items[0].text).toBe('Festive sale: use FEST for 20% off');
  });
});

const mockSaved = [];
let mockExisting = { email: null, phoneTaken: false };

jest.mock('../models/Admin', () => {
  function Admin(data) {
    Object.assign(this, data, { _id: 'new-merchant-id', createdAt: new Date() });
  }
  Admin.prototype.save = function save() {
    const allowed = ['active', 'inactive', 'trial', 'cancelled'];
    if (!allowed.includes(this.subscriptionStatus)) {
      return Promise.reject(new Error(`subscriptionStatus: \`${this.subscriptionStatus}\` is not a valid enum value`));
    }
    mockSaved.push(this);
    return Promise.resolve(this);
  };
  Admin.findOne = jest.fn((query) => {
    if (query.email) return Promise.resolve(query.email === mockExisting.email ? { _id: 'x' } : null);
    return { select: () => Promise.resolve(mockExisting.phoneTaken ? { _id: 'other' } : null) };
  });
  return Admin;
});
jest.mock('../models/PricingPlan', () => ({
  findById: jest.fn(() => Promise.resolve({ _id: 'plan-growth', name: 'growth', displayName: 'Growth', monthlyPrice: 2499, usageLimits: { geminiTokensPerMonth: -1 } })),
  findOne: jest.fn(() => Promise.resolve(null))
}));
jest.mock('../services/permissionService', () => ({ getEffectiveAccessPayload: jest.fn(() => Promise.resolve({ data: { effectivePages: ['dashboard'] } })) }));
jest.mock('../services/auditLogService', () => ({ logAction: jest.fn(() => Promise.resolve()) }));
jest.mock('../services/emailService', () => ({ sendEmail: jest.fn(() => Promise.resolve()) }));
jest.mock('../services/whatsappCredentialService', () => ({ encrypt: jest.fn((v) => `enc:${v}`) }));

const { onboardCustomer } = require('../controllers/superAdmin/onboardingWizardController');
const auditLogService = require('../services/auditLogService');

const run = async (body) => {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  await onboardCustomer({ body, admin: { _id: 'sa', email: 'sa@example.test' }, headers: {}, socket: {} }, res);
  return res;
};

const base = {
  name: 'Rajesh Kumar',
  email: 'Rajesh@Example.test',
  password: 'initial-pass-123',
  businessName: 'Nexus Retailers',
  phoneNumber: '+91 98765 43210',
  pricingPlanId: 'plan-growth',
  subscriptionPlan: 'growth',
  billingCycle: 'monthly',
  sendWelcomeEmail: false
};

beforeEach(() => {
  mockSaved.length = 0;
  mockExisting = { email: null, phoneTaken: false };
  jest.clearAllMocks();
});

describe('onboarding a merchant from the Super Admin wizard', () => {
  test('saves the phone number where the account keeps it', async () => {
    const res = await run({ ...base, subscriptionStatus: 'active' });
    expect(res.statusCode).toBe(201);
    expect(mockSaved[0]).toMatchObject({ businessPhone: '+91 98765 43210', email: 'rajesh@example.test', subscriptionPlan: 'growth', isActive: true });
    expect(mockSaved[0].phoneNumber).toBeUndefined();
  });

  test('saves the WhatsApp details from step 5 (not connected until the merchant adds a token)', async () => {
    await run({ ...base, whatsappPhoneNumber: '+91 90000 11111', wabaId: ' 2233 ', phoneNumberId: ' 445566 ' });
    expect(mockSaved[0]).toMatchObject({
      whatsappPhoneNumberId: '445566',
      whatsappBusinessAccountId: '2233',
      whatsappDisplayPhoneNumber: '+91 90000 11111',
      whatsappConnected: false
    });
  });

  test('refuses a WhatsApp number already used by another merchant', async () => {
    mockExisting.phoneTaken = true;
    const res = await run({ ...base, phoneNumberId: '445566' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch('already connected to another merchant');
    expect(mockSaved).toHaveLength(0);
  });

  test('"Save as draft" works: the account is created inactive', async () => {
    const res = await run({ ...base, isDraft: true });
    expect(res.statusCode).toBe(201);
    expect(mockSaved[0]).toMatchObject({ subscriptionStatus: 'inactive', isActive: false });
    expect(res.body.message).toMatch('draft');
  });

  test.each([
    ['trial', 'trial', true],
    ['suspended', 'inactive', false],
    ['cancelled', 'cancelled', false]
  ])('status %s is saved as %s', async (given, saved, active) => {
    await run({ ...base, subscriptionStatus: given });
    expect(mockSaved[0]).toMatchObject({ subscriptionStatus: saved, isActive: active });
  });

  test('an unknown status is refused instead of crashing', async () => {
    const res = await run({ ...base, subscriptionStatus: 'paused' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch('Unknown subscription status');
  });

  test('the onboarding is written to the audit log', async () => {
    await run(base);
    expect(auditLogService.logAction).toHaveBeenCalledWith(expect.objectContaining({
      action: 'customer_onboarded',
      actor: expect.objectContaining({ email: 'sa@example.test' }),
      target: 'rajesh@example.test'
    }));
  });

  test('an existing email is still refused', async () => {
    mockExisting.email = 'rajesh@example.test';
    const res = await run(base);
    expect(res.statusCode).toBe(400);
  });
});

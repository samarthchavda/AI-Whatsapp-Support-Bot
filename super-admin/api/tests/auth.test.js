process.env.JWT_ACCESS_SECRET = 'test-secret';
process.env.INTERNAL_API_KEY = 'internal-test-key';
const jwt = require('jsonwebtoken');

const mockAdmins = {
  sa: { _id: 'sa', email: 'sa@example.test', role: 'super_admin', isActive: true, refreshTokens: [{ sessionId: 's1' }] },
  merchant: { _id: 'merchant', email: 'm@example.test', role: 'admin', isActive: true, refreshTokens: [] },
  off: { _id: 'off', email: 'off@example.test', role: 'super_admin', isActive: false, refreshTokens: [] }
};
jest.mock('../src/models', () => ({
  Admin: { findById: jest.fn((id) => ({ select: () => ({ lean: () => Promise.resolve(mockAdmins[id] || null) }) })) },
  Coupon: { find: jest.fn(() => ({ sort: () => ({ lean: () => Promise.resolve([]) }) })) },
  PricingPlan: {},
  Invoice: {},
  AuditLog: {}
}));

const request = require('supertest');
const { createApp } = require('../src/app');
const app = createApp();
const token = (payload) => jwt.sign({ tokenType: 'access', ...payload }, 'test-secret');

describe('who can use the super admin API', () => {
  test('a super admin with a live session', async () => {
    const res = await request(app).get('/sa-api/v1/coupons').set('Authorization', `Bearer ${token({ id: 'sa', sessionId: 's1' })}`);
    expect(res.status).toBe(200);
  });

  test.each([
    ['no token', null, 401],
    ['a merchant', { id: 'merchant' }, 403],
    ['a disabled super admin', { id: 'off' }, 403],
    ['an ended session', { id: 'sa', sessionId: 'gone' }, 401],
    ['a login-as-merchant token', { id: 'sa', isImpersonated: true }, 401],
    ['a refresh token', { id: 'sa', tokenType: 'refresh' }, 401]
  ])('refuses %s', async (_, payload, status) => {
    const req = request(app).get('/sa-api/v1/coupons');
    if (payload) req.set('Authorization', `Bearer ${token(payload)}`);
    expect((await req).status).toBe(status);
  });

  test('a token signed with another secret is refused', async () => {
    const bad = jwt.sign({ id: 'sa', tokenType: 'access' }, 'other-secret');
    expect((await request(app).get('/sa-api/v1/coupons').set('Authorization', `Bearer ${bad}`)).status).toBe(401);
  });

  test('internal routes need the internal key', async () => {
    expect((await request(app).post('/sa-api/v1/internal/redeem')).status).toBe(401);
    expect((await request(app).post('/sa-api/v1/internal/redeem').set('X-Internal-Key', 'wrong-key-of-same-len')).status).toBe(401);
  });
});

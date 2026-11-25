const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const planAssignment = require('../services/planAssignmentService');
const auditLogService = require('../services/auditLogService');
const { signup } = require('../controllers/public/authController');

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-bytes-long-string-for-jest-tests!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-bytes-long-string-for-jest-tests!';

const validBody = {
  name: 'Merchant Owner', businessName: 'Example Store', businessPhone: '+91 98765 43210',
  email: 'Owner@Example.com', password: 'SecurePassword123', termsAccepted: true
};

const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), cookie: jest.fn() });
const request = (body) => ({ body, get: jest.fn(() => 'kwickbot.in'), headers: {}, ip: '127.0.0.1' });

describe('Merchant self signup', () => {
  afterEach(() => jest.restoreAllMocks());

  test('creates only a Starter trial account and signs the merchant in', async () => {
    const start = new Date('2026-11-24T00:00:00.000Z');
    const end = new Date('2026-12-08T00:00:00.000Z');
    jest.spyOn(Admin, 'exists').mockResolvedValue(null);
    const assignment = jest.spyOn(planAssignment, 'resolvePlanAssignment').mockResolvedValue({
      subscriptionPlan: 'starter', subscriptionStatus: 'trial', subscriptionStartDate: start,
      subscriptionEndDate: end, monthlyPrice: 1499, geminiTokensLimit: 50000
    });
    const admin = {
      _id: new mongoose.Types.ObjectId(), email: 'owner@example.com', role: 'admin',
      refreshTokens: [], save: jest.fn().mockResolvedValue(undefined)
    };
    const create = jest.spyOn(Admin, 'create').mockImplementation(async (data) => {
      Object.assign(admin, data);
      return admin;
    });
    jest.spyOn(auditLogService, 'logAction').mockResolvedValue(undefined);
    const res = response();

    await signup(request({ ...validBody, subscriptionPlan: 'scale', role: 'super_admin', monthlyPrice: 0 }), res);

    expect(assignment).toHaveBeenCalledWith({ subscriptionPlan: 'starter', subscriptionStatus: 'trial', trialDays: 14 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'owner@example.com', role: 'admin', subscriptionPlan: 'starter',
      subscriptionStatus: 'trial', profileCompleted: false, trialStartedAt: start
    }));
    expect(admin.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].data.admin.subscriptionPlan).toBe('starter');
  });

  test('rejects duplicate email', async () => {
    jest.spyOn(Admin, 'exists').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
    const res = response();
    await signup(request(validBody), res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test.each([
    [{ ...validBody, password: 'short1' }, 400],
    [{ ...validBody, termsAccepted: false }, 400],
    [{ ...validBody, businessPhone: '123' }, 400]
  ])('rejects invalid signup details', async (body, status) => {
    const res = response();
    await signup(request(body), res);
    expect(res.status).toHaveBeenCalledWith(status);
  });
});

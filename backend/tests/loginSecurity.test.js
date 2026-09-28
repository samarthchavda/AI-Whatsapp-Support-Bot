const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const RateLimitEntry = require('../models/RateLimitEntry');
const mongoRateLimiter = require('../middleware/mongoRateLimiter');
const { login, forgotPassword } = require('../controllers/public/authController');

// Set dummy JWT secrets for testing
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-bytes-long-string-for-jest-tests!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-bytes-long-string-for-jest-tests!';

// Mock Mongoose model saves and RateLimit mongo calls during unit tests
jest.spyOn(AuditLog.prototype, 'save').mockResolvedValue(true);
jest.spyOn(Admin.prototype, 'save').mockResolvedValue(true);
jest.spyOn(RateLimitEntry, 'findOneAndUpdate').mockResolvedValue({ count: 1 });
jest.spyOn(RateLimitEntry, 'findOne').mockResolvedValue(null);
jest.spyOn(RateLimitEntry, 'deleteOne').mockResolvedValue(true);

describe('Login & Account Lockout Security Tests', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn()
    };
  });

  test('Nonexistent email returns identical generic 401 error message as wrong password', async () => {
    const req = {
      body: { email: 'nonexistent_test_user_12345@gmail.com', password: 'wrongpassword' },
      get: () => '',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' }
    };

    jest.spyOn(Admin, 'findOne').mockResolvedValue(null);

    await login(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid credentials',
      message: 'Email or password is incorrect'
    });

    Admin.findOne.mockRestore();
  });

  test('5 consecutive failed logins trigger exponential lockout on account', async () => {
    const rawPassword = 'ValidPassword123!';
    const passwordHash = bcrypt.hashSync(rawPassword, 10);
    const mockAdmin = new Admin({
      _id: new mongoose.Types.ObjectId(),
      email: 'lockout_test@kwickbot.in',
      password: passwordHash,
      name: 'Test Lockout Admin',
      role: 'admin',
      failedLoginAttempts: 4
    });

    jest.spyOn(Admin, 'findOne').mockResolvedValue(mockAdmin);

    const req = {
      body: { email: 'lockout_test@kwickbot.in', password: 'WrongPassword' },
      get: () => '',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' }
    };

    await login(req, mockRes);

    expect(mockAdmin.failedLoginAttempts).toBe(5);
    expect(mockAdmin.lockedUntil).toBeInstanceOf(Date);
    expect(mockAdmin.lockedUntil.getTime()).toBeGreaterThan(Date.now());
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid credentials',
      message: 'Email or password is incorrect'
    });

    Admin.findOne.mockRestore();
  });

  test('Locked account rejects login attempt even with correct password', async () => {
    const rawPassword = 'ValidPassword123!';
    const passwordHash = bcrypt.hashSync(rawPassword, 10);
    const mockAdmin = new Admin({
      _id: new mongoose.Types.ObjectId(),
      email: 'locked_admin@kwickbot.in',
      password: passwordHash,
      name: 'Locked Admin',
      role: 'admin',
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() + 15 * 60 * 1000) // Locked for 15 mins
    });

    jest.spyOn(Admin, 'findOne').mockResolvedValue(mockAdmin);

    const req = {
      body: { email: 'locked_admin@kwickbot.in', password: rawPassword },
      get: () => '',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' }
    };

    await login(req, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid credentials',
      message: 'Email or password is incorrect'
    });

    Admin.findOne.mockRestore();
  });

  test('Successful login resets failedLoginAttempts and lockedUntil', async () => {
    const rawPassword = 'ValidPassword123!';
    const passwordHash = bcrypt.hashSync(rawPassword, 10);
    const mockAdmin = new Admin({
      _id: new mongoose.Types.ObjectId(),
      email: 'success_admin@kwickbot.in',
      password: passwordHash,
      name: 'Success Admin',
      role: 'admin',
      failedLoginAttempts: 3,
      lockedUntil: null
    });

    jest.spyOn(Admin, 'findOne').mockResolvedValue(mockAdmin);

    const req = {
      body: { email: 'success_admin@kwickbot.in', password: rawPassword },
      get: () => 'kwickbot.in',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' }
    };

    await login(req, mockRes);

    expect(mockAdmin.failedLoginAttempts).toBe(0);
    expect(mockAdmin.lockedUntil).toBeNull();
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Login successful'
      })
    );

    Admin.findOne.mockRestore();
  });

  test('forgotPassword returns identical response for existing and nonexistent emails', async () => {
    const reqNonexistent = { body: { email: 'unknown_user_999@gmail.com' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } };
    const res1 = { json: jest.fn() };
    jest.spyOn(Admin, 'findOne').mockResolvedValue(null);

    await forgotPassword(reqNonexistent, res1);

    expect(res1.json).toHaveBeenCalledWith({
      success: true,
      message: 'If an account with that email address exists, password reset instructions have been sent.'
    });

    Admin.findOne.mockRestore();
  });
});

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const RateLimitEntry = require('../models/RateLimitEntry');
const auditLogService = require('../services/auditLogService');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyToken,
  verifyRefreshToken
} = require('../middleware/auth');
const { refresh, logout, resetPassword, changePassword } = require('../controllers/public/authController');

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-bytes-long-string-for-jest-tests!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-bytes-long-string-for-jest-tests!';

jest.spyOn(AuditLog.prototype, 'save').mockResolvedValue(true);
jest.spyOn(Admin.prototype, 'save').mockResolvedValue(true);
jest.spyOn(auditLogService, 'logAction').mockResolvedValue(true);
jest.spyOn(RateLimitEntry, 'findOneAndUpdate').mockResolvedValue({ count: 1 });
jest.spyOn(RateLimitEntry, 'findOne').mockResolvedValue(null);
jest.spyOn(RateLimitEntry, 'deleteOne').mockResolvedValue(true);

describe('Session Lifecycle & Security Management Tests', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn(),
      clearCookie: jest.fn()
    };
  });

  test('Access tokens expire in 15 minutes', () => {
    const adminId = new mongoose.Types.ObjectId().toString();
    const token = generateAccessToken(adminId, { sessionId: 'sess_123' });
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    expect(decoded.exp - decoded.iat).toBe(15 * 60);
  });

  test('Server-enforced idle timeout invalidates session after 2 hours of inactivity', async () => {
    const adminId = new mongoose.Types.ObjectId().toString();
    const sessionId = 'sess_idle_test';
    const oldActivity = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago

    const mockAdmin = new Admin({
      _id: adminId,
      email: 'idle@kwickbot.in',
      isActive: true,
      refreshTokens: [
        {
          sessionId,
          hash: 'hash_123',
          createdAt: oldActivity,
          lastActivity: oldActivity,
          expiresAt: new Date(Date.now() + 86400000)
        }
      ]
    });

    mockAdmin.save = jest.fn().mockResolvedValue(mockAdmin);
    jest.spyOn(Admin, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(mockAdmin)
    });

    const accessToken = generateAccessToken(adminId, { sessionId });
    const req = { headers: { authorization: `Bearer ${accessToken}` } };

    await verifyToken(req, mockRes, jest.fn());

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Token expired',
        message: expect.stringContaining('inactivity')
      })
    );

    Admin.findById.mockRestore();
  });

  test('Absolute session lifetime limit (7 days) invalidates session even if active', async () => {
    const adminId = new mongoose.Types.ObjectId().toString();
    const sessionId = 'sess_abs_test';
    const createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago

    const mockAdmin = new Admin({
      _id: adminId,
      email: 'absolute@kwickbot.in',
      isActive: true,
      refreshTokens: [
        {
          sessionId,
          hash: 'hash_123',
          createdAt,
          lastActivity: new Date(), // active recently
          expiresAt: createdAt // expired 1 day ago
        }
      ]
    });

    mockAdmin.save = jest.fn().mockResolvedValue(mockAdmin);
    jest.spyOn(Admin, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue(mockAdmin)
    });

    const accessToken = generateAccessToken(adminId, { sessionId });
    const req = { headers: { authorization: `Bearer ${accessToken}` } };

    await verifyToken(req, mockRes, jest.fn());

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Token expired',
        message: expect.stringContaining('Maximum session lifetime')
      })
    );

    Admin.findById.mockRestore();
  });

  test('Refresh token reuse detection revokes token family and logs audit event', async () => {
    const adminId = new mongoose.Types.ObjectId().toString();
    const sessionId = 'sess_reuse_test';
    const reusedToken = generateRefreshToken(adminId, { sessionId, v: 1 });
    const reusedHash = hashToken(reusedToken);
    const activeToken = generateRefreshToken(adminId, { sessionId, v: 2 });
    const activeHash = hashToken(activeToken);

    const mockAdmin = new Admin({
      _id: adminId,
      email: 'reuse@kwickbot.in',
      isActive: true,
      refreshTokens: [
        {
          sessionId,
          hash: activeHash,
          previousHashes: [reusedHash],
          createdAt: new Date(),
          lastActivity: new Date(),
          expiresAt: new Date(Date.now() + 86400000)
        }
      ]
    });

    mockAdmin.save = jest.fn().mockResolvedValue(mockAdmin);
    jest.spyOn(Admin, 'findById').mockResolvedValue(mockAdmin);

    const req = {
      headers: { cookie: `refreshToken=${reusedToken}` },
      get: () => '',
      socket: { remoteAddress: '127.0.0.1' }
    };

    await refresh(req, mockRes);

    expect(mockAdmin.refreshTokens).toHaveLength(0); // Session family revoked!
    expect(auditLogService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'refresh_token_reuse_detected'
      })
    );
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Security violation'
      })
    );

    Admin.findById.mockRestore();
  });

  test('Logout invalidates server-side session', async () => {
    const adminId = new mongoose.Types.ObjectId().toString();
    const sessionId = 'sess_logout_test';
    const refreshToken = generateRefreshToken(adminId, { sessionId });
    const rHash = hashToken(refreshToken);

    const mockAdmin = new Admin({
      _id: adminId,
      email: 'logout@kwickbot.in',
      isActive: true,
      refreshTokens: [
        {
          sessionId,
          hash: rHash,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000)
        }
      ]
    });

    jest.spyOn(Admin, 'findOne').mockResolvedValue(mockAdmin);

    const req = {
      headers: { cookie: `refreshToken=${refreshToken}` },
      body: {}
    };

    await logout(req, mockRes);

    expect(mockAdmin.refreshTokens).toHaveLength(0);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Logout successful'
      })
    );

    Admin.findOne.mockRestore();
  });

  test('Password reset revokes all active sessions for the user', async () => {
    const adminId = new mongoose.Types.ObjectId().toString();
    const mockAdmin = new Admin({
      _id: adminId,
      email: 'reset@kwickbot.in',
      resetPasswordToken: 'valid_token_123',
      resetPasswordExpires: new Date(Date.now() + 3600000),
      refreshTokens: [{ sessionId: 's1', hash: 'h1' }, { sessionId: 's2', hash: 'h2' }]
    });

    jest.spyOn(Admin, 'findOne').mockResolvedValue(mockAdmin);

    const req = {
      params: { token: 'valid_token_123' },
      body: { password: 'NewSecurePassword123!' },
      headers: {},
      socket: { remoteAddress: '127.0.0.1' }
    };

    await resetPassword(req, mockRes);

    expect(mockAdmin.refreshTokens).toHaveLength(0); // All sessions cleared!
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('Password reset successful')
      })
    );

    Admin.findOne.mockRestore();
  });
});

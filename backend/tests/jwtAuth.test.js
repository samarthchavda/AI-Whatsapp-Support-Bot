const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Set dummy JWT secrets before requiring auth module
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-bytes-long-string-for-jest-tests!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-bytes-long-string-for-jest-tests!';

const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyToken
} = require('../middleware/auth');

describe('JWT Security & Authentication Tests', () => {
  const dummyAdminId = new mongoose.Types.ObjectId().toString();

  test('generateAccessToken creates valid access token with tokenType access', () => {
    const token = generateAccessToken(dummyAdminId);
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    expect(decoded.id).toBe(dummyAdminId);
    expect(decoded.tokenType).toBe('access');
  });

  test('generateRefreshToken creates valid refresh token with tokenType refresh', () => {
    const token = generateRefreshToken(dummyAdminId);
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe(dummyAdminId);
    expect(decoded.tokenType).toBe('refresh');
  });

  test('verifyToken fails for forged token signed with wrong secret', async () => {
    const forgedToken = jwt.sign(
      { id: dummyAdminId, tokenType: 'access' },
      'wrong-secret-key-1234567890123456'
    );
    const req = { headers: { authorization: `Bearer ${forgedToken}` } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Invalid token'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken fails for expired token', async () => {
    const expiredToken = jwt.sign(
      { id: dummyAdminId, tokenType: 'access', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_ACCESS_SECRET
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Token expired'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyToken fails when a refresh token is used as access token', async () => {
    const refreshToken = generateRefreshToken(dummyAdminId);
    const req = { headers: { authorization: `Bearer ${refreshToken}` } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Invalid token'
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('verifyRefreshToken fails when an access token is passed as refresh token', () => {
    const accessToken = generateAccessToken(dummyAdminId);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});

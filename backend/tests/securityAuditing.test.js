const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { isOriginAllowed, corsOriginHelper, verifyCsrfOrigin } = require('../middleware/originSecurity');
const { getAIStats, getAILogs, getConversationWithLogs } = require('../controllers/merchant/aiController');
const Admin = require('../models/Admin');
const Conversation = require('../models/Conversation');
const AILog = require('../models/AILog');
const Escalation = require('../models/Escalation');

process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-bytes-long-string-for-jest-tests!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-bytes-long-string-for-jest-tests!';

describe('Security, CORS, CSRF, Socket.IO & Tenant Isolation Tests', () => {

  describe('1. CORS Origin Allowlist & Malformed Origin Rejection', () => {
    test('Allows approved Kwickbot production origins', () => {
      expect(isOriginAllowed('https://kwickbot.in')).toBe(true);
      expect(isOriginAllowed('https://admin.kwickbot.in')).toBe(true);
      expect(isOriginAllowed('https://www.kwickbot.in')).toBe(true);
      expect(isOriginAllowed('https://api.kwickbot.in')).toBe(true);
    });

    test('Rejects wildcard subdomains and malicious origin domains', () => {
      expect(isOriginAllowed('https://attacker.kwickbot.in')).toBe(false);
      expect(isOriginAllowed('https://maliciouskwickbot.in')).toBe(false);
      expect(isOriginAllowed('https://kwickbot.in.evil.org')).toBe(false);
      expect(isOriginAllowed('https://randomwebsite.com')).toBe(false);
    });

    test('Rejects malformed origin URI strings safely', () => {
      expect(isOriginAllowed('invalid-url-string')).toBe(false);
      expect(isOriginAllowed('http://')).toBe(false);
      expect(isOriginAllowed('://bad-uri')).toBe(false);
    });

    test('Allows requests with no origin header (curl/mobile/server-to-server)', () => {
      expect(isOriginAllowed(null)).toBe(true);
      expect(isOriginAllowed(undefined)).toBe(true);
    });
  });

  describe('2. CSRF Origin Protection Middleware', () => {
    let mockRes;
    let nextFn;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      nextFn = jest.fn();
    });

    test('Passes state-changing request with valid origin header', () => {
      const req = {
        method: 'POST',
        headers: { origin: 'https://admin.kwickbot.in' }
      };

      verifyCsrfOrigin(req, mockRes, nextFn);
      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('Rejects state-changing request with unapproved origin header with 403', () => {
      const req = {
        method: 'POST',
        headers: { origin: 'https://attacker.com' }
      };

      verifyCsrfOrigin(req, mockRes, nextFn);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'CSRF Protection',
          message: expect.stringContaining('Invalid or unapproved')
        })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });
  });

  describe('3. Tenant Data Isolation Tests (Merchant Isolation)', () => {
    let merchantA;
    let merchantB;
    let mockRes;

    beforeEach(() => {
      merchantA = {
        _id: new mongoose.Types.ObjectId(),
        email: 'merchantA@store.com',
        role: 'merchant'
      };

      merchantB = {
        _id: new mongoose.Types.ObjectId(),
        email: 'merchantB@store.com',
        role: 'merchant'
      };

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('Merchant A querying AI Stats receives ONLY Merchant A data', async () => {
      const convA = { _id: new mongoose.Types.ObjectId(), admin: merchantA._id };
      const convB = { _id: new mongoose.Types.ObjectId(), admin: merchantB._id };

      jest.spyOn(Conversation, 'find').mockImplementation((query) => ({
        select: () => ({
          lean: jest.fn().mockResolvedValue(
            query.admin.toString() === merchantA._id.toString() ? [convA] : [convB]
          )
        })
      }));

      jest.spyOn(AILog, 'countDocuments').mockImplementation((filter) => {
        if (filter.admin?.toString() === merchantA._id.toString() || filter['$or']?.[0]?.admin?.toString() === merchantA._id.toString()) {
          return Promise.resolve(10);
        }
        return Promise.resolve(500);
      });

      jest.spyOn(AILog, 'aggregate').mockResolvedValue([{ _id: 'general_inquiry', count: 10 }]);
      jest.spyOn(Escalation, 'countDocuments').mockResolvedValue(2);
      jest.spyOn(Escalation, 'aggregate').mockResolvedValue([]);
      jest.spyOn(Conversation, 'countDocuments').mockResolvedValue(5);

      const reqA = { admin: merchantA };
      await getAIStats(reqA, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          stats: expect.objectContaining({
            totalMessages: 10
          })
        })
      );
    });

    test('Merchant A attempting to access Merchant B conversation logs returns 403 Forbidden', async () => {
      const convB = {
        _id: new mongoose.Types.ObjectId(),
        admin: merchantB._id,
        customerPhone: '+919876543210',
        messages: [{ content: 'Private message of Merchant B' }]
      };

      jest.spyOn(Conversation, 'findById').mockResolvedValue(convB);

      const reqA = {
        admin: merchantA,
        params: { conversationId: convB._id.toString() }
      };

      await getConversationWithLogs(reqA, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Access denied')
        })
      );
    });
  });
});

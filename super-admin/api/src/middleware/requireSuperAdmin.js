const jwt = require('jsonwebtoken');
const config = require('../config');
const { Admin } = require('../models');

// Accepts the access token the main backend issues at login (same secret),
// with the same checks: access token, active account, live session.
// Only super admins, and never a "log in as merchant" token.
module.exports = async function requireSuperAdmin(req, res, next) {
  try {
    const [scheme, token] = String(req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, error: 'Not logged in' });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtAccessSecret());
    } catch {
      return res.status(401).json({ success: false, error: 'Token expired', message: 'Please log in again' });
    }
    if (decoded.tokenType !== 'access' || decoded.isImpersonated) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const admin = await Admin.findById(decoded.id).select('email name role isActive refreshTokens').lean();
    if (!admin) return res.status(401).json({ success: false, error: 'Invalid token' });
    if (!admin.isActive) return res.status(403).json({ success: false, error: 'Account disabled' });
    if (admin.role !== 'super_admin') return res.status(403).json({ success: false, error: 'Super admins only' });

    if (decoded.sessionId) {
      const session = (admin.refreshTokens || []).find((s) => s.sessionId === decoded.sessionId);
      if (!session || (session.expiresAt && new Date(session.expiresAt) <= new Date())) {
        return res.status(401).json({ success: false, error: 'Token expired', message: 'Session ended. Please log in again' });
      }
    }

    req.admin = { _id: admin._id, email: admin.email, name: admin.name };
    return next();
  } catch (error) {
    return next(error);
  }
};

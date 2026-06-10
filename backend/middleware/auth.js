const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../models/Admin');

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

const getAccessTokenSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const getRefreshTokenSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key-change-in-production';

const generateAccessToken = (adminId) => jwt.sign(
  { id: adminId, tokenType: 'access' },
  getAccessTokenSecret(),
  { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
);

const generateRefreshToken = (adminId) => jwt.sign(
  { id: adminId, tokenType: 'refresh' },
  getRefreshTokenSecret(),
  { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
);

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const verifyRefreshToken = (token) => jwt.verify(token, getRefreshTokenSecret());

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No access token provided',
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, getAccessTokenSecret());

    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Admin not found'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token is invalid'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Your session has expired. Please login again'
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (token) {
      const decoded = jwt.verify(token, getAccessTokenSecret());
      const admin = await Admin.findById(decoded.id).select('-password');
      
      if (admin && admin.isActive) {
        req.admin = admin;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
  }
  
  next();
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
  verifyToken,
  optionalAuth
};

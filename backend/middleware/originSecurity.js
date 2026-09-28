const { URL } = require('url');

const DEFAULT_ALLOWED_ORIGINS = [
  'https://kwickbot.in',
  'https://admin.kwickbot.in',
  'https://www.kwickbot.in',
  'https://api.kwickbot.in'
];

const DEV_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
];

const getApprovedOriginsList = () => {
  const customOrigins = [];
  ['FRONTEND_URL', 'ALLOWED_ORIGINS'].forEach((envKey) => {
    if (process.env[envKey]) {
      process.env[envKey].split(',').forEach((item) => {
        const trimmed = item.trim();
        if (trimmed) customOrigins.push(trimmed);
      });
    }
  });

  const list = [...DEFAULT_ALLOWED_ORIGINS, ...customOrigins];
  if (process.env.NODE_ENV !== 'production') {
    list.push(...DEV_ALLOWED_ORIGINS);
  }

  return Array.from(new Set(list));
};

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Non-browser clients (curl, mobile, backend server-to-server)

  try {
    const parsed = new URL(origin);
    const normalizedOrigin = `${parsed.protocol}//${parsed.host}`.toLowerCase();
    const approvedList = getApprovedOriginsList().map(item => {
      try {
        const u = new URL(item);
        return `${u.protocol}//${u.host}`.toLowerCase();
      } catch (e) {
        return item.toLowerCase();
      }
    });

    return approvedList.includes(normalizedOrigin);
  } catch (error) {
    return false; // Reject malformed origin URLs
  }
};

const corsOriginHelper = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    return callback(null, true);
  }
  return callback(new Error('Not allowed by CORS'));
};

const verifyCsrfOrigin = (req, res, next) => {
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!isStateChanging) {
    return next();
  }

  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  if (originHeader) {
    if (!isOriginAllowed(originHeader)) {
      return res.status(403).json({
        success: false,
        error: 'CSRF Protection',
        message: 'Invalid or unapproved request origin'
      });
    }
  } else if (refererHeader) {
    try {
      const refOrigin = new URL(refererHeader).origin;
      if (!isOriginAllowed(refOrigin)) {
        return res.status(403).json({
          success: false,
          error: 'CSRF Protection',
          message: 'Invalid or unapproved request origin'
        });
      }
    } catch (e) {
      return res.status(403).json({
        success: false,
        error: 'CSRF Protection',
        message: 'Malformed request referer header'
      });
    }
  }

  next();
};

module.exports = {
  isOriginAllowed,
  corsOriginHelper,
  verifyCsrfOrigin,
  getApprovedOriginsList
};

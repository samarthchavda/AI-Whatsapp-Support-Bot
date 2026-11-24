const crypto = require('crypto');
const config = require('../config');

// For the main backend's checkout hook only (header X-Internal-Key)
module.exports = function requireInternalKey(req, res, next) {
  const expected = config.internalApiKey();
  const given = String(req.headers['x-internal-key'] || '');
  if (!expected || given.length !== expected.length
    || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  return next();
};

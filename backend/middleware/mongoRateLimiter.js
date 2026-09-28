const RateLimitEntry = require('../models/RateLimitEntry');

/**
 * Increment rate limit count for a key in MongoDB
 */
async function incrementRateLimitKey(key, windowMs) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  const doc = await RateLimitEntry.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt }
    },
    { upsert: true, new: true }
  );

  return doc;
}

/**
 * Get current rate limit count for a key
 */
async function getRateLimitKey(key) {
  const doc = await RateLimitEntry.findOne({ key, expiresAt: { $gt: new Date() } });
  return doc ? doc.count : 0;
}

/**
 * Reset rate limit key in MongoDB
 */
async function resetRateLimitKey(key) {
  await RateLimitEntry.deleteOne({ key });
}

/**
 * Express middleware factory for MongoDB-backed shared rate limiting across PM2 workers
 */
function createMongoRateLimiter({ prefix = 'rl', windowMs = 15 * 60 * 1000, maxRequests = 10, keyGenerator, message = 'Too many requests' }) {
  return async (req, res, next) => {
    try {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1';
      const generatedKey = keyGenerator ? keyGenerator(req) : clientIp;
      const fullKey = `${prefix}:${generatedKey}`;

      const doc = await incrementRateLimitKey(fullKey, windowMs);

      if (doc && doc.count > maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          message
        });
      }

      next();
    } catch (error) {
      console.error('Mongo rate limiter error:', error);
      next(); // fallback gracefully on DB error
    }
  };
}

module.exports = {
  createMongoRateLimiter,
  incrementRateLimitKey,
  getRateLimitKey,
  resetRateLimitKey
};

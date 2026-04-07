
const { redisClient } = require('../config/redis');

/**
 * Redis-backed sliding-window rate limiter.
 * @param {number} maxRequests  – allowed requests per window
 * @param {number} windowSec    – window size in seconds
 */
const rateLimiter = (maxRequests = 60, windowSec = 60) => async (req, res, next) => {
  // Use authenticated user id if available, otherwise fall back to IP
  const identifier = req.user?._id?.toString() || req.ip;
  const key        = `ratelimit:${identifier}:${req.path}`;

  try {
    const current = await redisClient.incr(key);

    if (current === 1) {
      // First request in this window — set expiry
      await redisClient.expire(key, windowSec);
    }

    res.setHeader('X-RateLimit-Limit',     maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

    if (current > maxRequests) {
      return res.status(429).json({
        status:  'error',
        message: 'Too many requests. Please slow down.',
      });
    }

    next();
  } catch (err) {
    console.error('Rate limiter error:', err.message);
    next();
  }
};

// Pre-configured limiters
const authLimiter    = rateLimiter(10, 60);   // 10 req/min  — for login/register
const apiLimiter     = rateLimiter(120, 60);  // 120 req/min — general API
const messageLimiter = rateLimiter(30, 10);   // 30 msg/10 s — message sending

module.exports = { rateLimiter, authLimiter, apiLimiter, messageLimiter };
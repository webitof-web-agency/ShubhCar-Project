const rateLimit = require('express-rate-limit');

/* =========================
   WEBHOOK RATE LIMITER
========================= */
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many webhook requests, please try again later',
      code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
    });
  },
});

module.exports = { webhookLimiter };

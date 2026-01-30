const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

/* =========================
   SHARED CONFIG
========================= */
const baseConfig = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      requestId: req.context?.requestId,
    });
  },
};

const ipKey = (req) => ipKeyGenerator(req);

/* =========================
   AUTH (VERY STRICT)
========================= */
exports.authLimiter = rateLimit({
  ...baseConfig,
  windowMs: 60 * 1000, // 1 minute
  max: 5, // dY"' HARD LIMIT
  keyGenerator: (req) =>
    `${ipKey(req)}:${req.body?.email || req.body?.phone || 'unknown'}`,
});

/* =========================
   PUBLIC API
========================= */
exports.apiLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
});

/* =========================
   VENDOR
========================= */
exports.vendorLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyGenerator: (req) =>
    req.user?.id ? `vendor:${req.user.id}` : ipKey(req),
});

/* =========================
   ADMIN (STRICTER THAN API)
========================= */
exports.adminLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: (req) =>
    req.user?.id ? `admin:${req.user.id}` : ipKey(req),
});

/* =========================
   PAYMENTS (PER USER)
========================= */
exports.paymentLimiter = rateLimit({
  ...baseConfig,
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  keyGenerator: (req) =>
    req.user?.id ? `payment:${req.user.id}` : ipKey(req),
});

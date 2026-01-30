const express = require('express');

/* =======================
   CORE MIDDLEWARES
======================= */
// const requestContext = require('../middlewares/requestContext.middleware');
// const responseMiddleware = require('../middlewares/response.middleware');
// const performanceMiddleware = require('../middlewares/performance.middleware');
// const { rateLimiter } = require('../config/rateLimiter');
const sanitize = require('../middlewares/sanitize.middleware');
// const metricsMiddleware = require('../middlewares/metrics.middleware');
// const { sentryErrorHandler } = require('../config/observability');

/* =======================
   ROUTE REGISTRY
======================= */
const registerRoutes = require('./routes');

/* =======================
   ERROR HANDLER
======================= */
const errorHandler = require('../middlewares/error.middleware');

const apiGateway = express.Router();
const isPaymentWebhook = (req) =>
  req.originalUrl?.startsWith('/api/v1/payments/webhook');

/* =======================
   GLOBAL PIPELINE (ORDER MATTERS)
======================= */

apiGateway.use((req, res, next) => {
  next();
});

// 1. Request metadata (requestId, trace)
// apiGateway.use(requestContext);

// 2. Performance tracking (must be after requestContext)
// apiGateway.use(performanceMiddleware);

// 3. Rate limiting (global safety net)
// apiGateway.use(rateLimiter);

// 3. Body parsing (safe limits) - skip webhooks to preserve raw body
apiGateway.use((req, res, next) => {
  if (isPaymentWebhook(req)) return next();
  return express.json({ limit: '1mb' })(req, res, next);
});
apiGateway.use((req, res, next) => {
  if (isPaymentWebhook(req)) return next();
  return express.urlencoded({ extended: true })(req, res, next);
});

// 4. Sanitize incoming payloads
apiGateway.use((req, res, next) => {
  if (isPaymentWebhook(req)) return next();
  return sanitize(req, res, next);
});

// 5. Metrics
// apiGateway.use(metricsMiddleware);

// 6. Standard response helpers
const responseMiddleware = require('../middlewares/response.middleware');
apiGateway.use(responseMiddleware);

// 7. Register all application routes
registerRoutes(apiGateway);

// 8. Centralized error handler (LAST)
const { sentryErrorHandler } = require('../config/observability');
apiGateway.use(sentryErrorHandler());
apiGateway.use(errorHandler);

module.exports = apiGateway;

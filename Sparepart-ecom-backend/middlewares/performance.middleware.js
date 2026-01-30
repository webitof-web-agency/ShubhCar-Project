const logger = require('../config/logger');

/**
 * PERFORMANCE TRACKING MIDDLEWARE
 * 
 * Tracks request duration and logs slow requests
 */
module.exports = function performanceMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();
  req.requestStartTime = startTime;

  // Capture response finish event
  const originalEnd = res.end;
  res.end = function(...args) {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    const route = req.route?.path || req.originalUrl;

    // Log request performance
    const perfLog = {
      type: 'request_performance',
      method: req.method,
      route,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100, // 2 decimal places
      requestId: req.id,
      userId: req.user?.id || null,
    };

    // Log slow requests (>3s)
    if (durationMs > 3000) {
      logger.warn('slow_request', {
        ...perfLog,
        threshold: 3000,
      });
    } else if (durationMs > 1000) {
      // Log moderately slow requests at info level
      logger.info('request_completed', perfLog);
    } else if (req.method !== 'GET' || res.statusCode >= 400) {
      // Log mutations and errors always
      logger.info('request_completed', perfLog);
    }

    // Call original end
    originalEnd.apply(res, args);
  };

  next();
};

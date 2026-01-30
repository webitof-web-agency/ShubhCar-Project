const { randomUUID } = require('crypto');
const logger = require('../lib/logger');

module.exports = function requestIdMiddleware(req, res, next) {
  const requestId =
    req.headers['x-request-id'] ||
    req.headers['x-correlation-id'] ||
    randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = process.hrtime.bigint();
  req.requestStartTime = start;

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const route = req.route?.path || req.originalUrl;
    logger.info('http_request', {
      type: 'http_request',
      route,
      method: req.method,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      requestId,
      userId: req.user?.id || null,
      entityId: null,
    });
  });

  next();
};

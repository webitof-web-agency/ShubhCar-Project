const logger = require('../config/logger');

function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const requestId = req.id || req.context?.requestId;
  if (requestId) {
    res.setHeader('X-Request-Id', requestId);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
    code = 'INVALID_ID';
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already exists` : 'Duplicate key error';
    code = 'DUPLICATE_KEY';
  }

  if (err.isJoi) {
    statusCode = 400;
    message = err.details?.[0]?.message || 'Invalid request data';
    code = 'VALIDATION_ERROR';
  }

  if (statusCode === 401) {
    code = 'UNAUTHORIZED';
  }

  if (statusCode === 403) {
    code = 'FORBIDDEN';
  }

  const durationMs = req.requestStartTime
    ? Number(process.hrtime.bigint() - req.requestStartTime) / 1e6
    : undefined;
  const route = req.route?.path || req.originalUrl;
  const userId = req.user?.id || null;

  logger.error('request_failed', {
    type: 'error',
    requestId,
    route,
    statusCode,
    code,
    message,
    path: route,
    method: req.method,
    userId,
    entityId:
      req.params?.orderId ||
      req.params?.paymentId ||
      req.params?.id ||
      null,
    durationMs: durationMs ? Math.round(durationMs) : undefined,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  return res.fail(
    process.env.NODE_ENV === 'production'
      ? sanitizeMessage(statusCode, message)
      : message,
    statusCode,
    code,
  );
}

function sanitizeMessage(statusCode, message) {
  if (statusCode >= 500) {
    return 'Something went wrong. Please try again later.';
  }
  return message;
}

module.exports = errorMiddleware;

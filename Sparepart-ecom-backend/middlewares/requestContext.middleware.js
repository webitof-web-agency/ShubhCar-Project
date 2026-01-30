const { randomUUID } = require('crypto');

module.exports = function requestContext(req, res, next) {
  const requestId =
    req.id ||
    req.headers['x-request-id'] ||
    req.headers['x-correlation-id'] ||
    randomUUID();

  req.context = Object.freeze({
    ...(req.context || {}),
    requestId,
    ip: req.ip,
    method: req.method,
    path: req.originalUrl,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  });

  res.setHeader('x-request-id', requestId);
  req.id = requestId;

  next();
};

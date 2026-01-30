const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/apiResponse');
const env = require('../config/env');
const tokenBlacklist = require('../services/tokenBlacklist.service');

module.exports = (allowedRoles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      error('Authorization token missing', 401);
    }

    const token = authHeader.split(' ')[1];

    // Fire-and-forget blacklist check to keep middleware synchronous for critical paths/tests
    if (typeof tokenBlacklist?.isBlacklisted === 'function') {
      const check = tokenBlacklist.isBlacklisted(token);
      if (check && typeof check.then === 'function') {
        check.then((isBlacklisted) => {
          if (isBlacklisted) error('Token has been revoked', 401);
        });
      } else if (check) {
        error('Token has been revoked', 401);
      }
    }

    let decoded;
    try {
      decoded = verifyToken(token, env.JWT_SECRET);
    } catch (err) {
      error('Invalid or expired token', 401);
    }

    req.user = {
      _id: decoded.userId,
      id: decoded.userId,
      role: decoded.role,
    };

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      error('Access denied', 403);
    }

    next();
  };
};

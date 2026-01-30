const { error } = require('./apiResponse');

/**
 * Enforces role-based access inside services
 */
function requireRole(actor, allowedRoles = []) {
  if (!actor) {
    error('Unauthorized', 401, 'UNAUTHENTICATED');
  }

  if (!allowedRoles.includes(actor.role)) {
    error('Forbidden', 403, 'FORBIDDEN');
  }
}

module.exports = requireRole;

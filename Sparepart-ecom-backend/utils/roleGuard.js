const { error } = require('./apiResponse');

const assertRole = (user, allowedRoles = []) => {
  if (!user) error('Unauthorized', 401);
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    error('Forbidden', 403);
  }
};

module.exports = { assertRole };

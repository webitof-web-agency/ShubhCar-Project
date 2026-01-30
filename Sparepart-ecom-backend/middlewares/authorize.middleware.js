const { error } = require('../utils/apiResponse');

module.exports = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      error('Unauthorized', 401);
    }

    if (
      Array.isArray(allowedRoles) &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(req.user.role)
    ) {
      error('Forbidden', 403);
    }

    next();
  };
};

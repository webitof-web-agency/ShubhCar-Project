const mongoose = require('mongoose');

module.exports = function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const val = req.params?.[paramName];
    if (!val || !mongoose.Types.ObjectId.isValid(val)) {
      return res.fail('Invalid identifier', 400, 'INVALID_ID');
    }
    next();
  };
};

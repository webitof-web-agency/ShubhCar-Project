const Joi = require('joi');

module.exports = function validate(schema, property = 'body') {
  if (!schema || !Joi.isSchema(schema)) {
    throw new Error('validate() requires a Joi schema');
  }

  return (req, res, next) => {
    const data = req[property];

    const { error, value } = schema.validate(data, {
      abortEarly: true,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      // Mark error as Joi error so error.middleware can classify it
      error.isJoi = true;
      return next(error);
    }

    // Replace request data with sanitized value
    req[property] = value;

    next();
  };
};

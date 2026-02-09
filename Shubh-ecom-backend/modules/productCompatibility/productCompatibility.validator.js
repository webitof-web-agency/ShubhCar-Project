const Joi = require('joi');

const upsertProductCompatibilitySchema = Joi.object({
  vehicleIds: Joi.array().items(Joi.string()).required(),
});

module.exports = {
  upsertProductCompatibilitySchema,
};

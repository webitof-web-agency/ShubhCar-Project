const Joi = require('joi');

exports.upsertSchema = Joi.object({
  value: Joi.alternatives()
    .try(Joi.string(), Joi.number(), Joi.array().items(Joi.string()))
    .required(),
});

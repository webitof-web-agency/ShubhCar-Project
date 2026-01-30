const Joi = require('joi');

const addSchema = Joi.object({
  productId: Joi.string().required(),
});

module.exports = {
  addSchema,
};

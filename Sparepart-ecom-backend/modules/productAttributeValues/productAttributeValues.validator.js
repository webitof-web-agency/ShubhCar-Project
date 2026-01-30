const Joi = require('joi');

const base = {
  productId: Joi.string().required(),
  attributeId: Joi.string().required(),
  value: Joi.string().required(),
  displayOrder: Joi.number().integer().min(0).default(0),
};

const createSchema = Joi.object({
  productId: base.productId,
  attributeId: base.attributeId,
  value: base.value,
  displayOrder: base.displayOrder,
});

const updateSchema = Joi.object({
  value: base.value.optional(),
  displayOrder: base.displayOrder.optional(),
}).min(1);

module.exports = {
  createSchema,
  updateSchema,
};

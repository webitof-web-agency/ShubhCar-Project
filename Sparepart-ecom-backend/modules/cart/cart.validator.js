const Joi = require('joi');

const addItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
});

const updateQtySchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});
const applyCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().required(),
});

module.exports = {
  addItemSchema,
  updateQtySchema,
  applyCouponSchema,
};

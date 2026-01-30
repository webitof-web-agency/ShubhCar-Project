const Joi = require('joi');

const createReturnSchema = Joi.object({
  orderId: Joi.string().required(),
  items: Joi.array()
    .items(
      Joi.object({
        orderItemId: Joi.string().required(),
        vendorId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        reason: Joi.string().max(500).required(),
      }),
    )
    .min(1)
    .required(),
});

const adminDecisionSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  adminNote: Joi.string().max(500).optional(),
});

const vendorConfirmSchema = Joi.object({
  vendorNote: Joi.string().max(500).optional(),
});

const completeSchema = Joi.object({
  adminNote: Joi.string().max(500).optional(),
});

module.exports = {
  createReturnSchema,
  adminDecisionSchema,
  vendorConfirmSchema,
  completeSchema,
};

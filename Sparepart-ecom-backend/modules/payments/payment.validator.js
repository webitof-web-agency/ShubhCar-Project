const Joi = require('joi');

const initiatePaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  gateway: Joi.string().valid('razorpay').required(),
});

const retryPaymentSchema = Joi.object({
  orderId: Joi.string().required(),
  gateway: Joi.string().valid('razorpay').required(),
});

const refundApprovalSchema = Joi.object({
  amount: Joi.number().positive().required(),
  reason: Joi.string().max(255).required(),
});

module.exports = {
  initiatePaymentSchema,
  retryPaymentSchema,
  refundApprovalSchema,
};

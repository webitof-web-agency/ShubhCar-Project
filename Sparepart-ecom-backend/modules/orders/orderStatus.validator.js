const Joi = require('joi');
const { ADMIN_STATUS_UPDATES } = require('../../constants/orderStatus');

const cancelOrderSchema = Joi.object({
  reason: Joi.string().min(3).required(),
});

const adminStatusUpdateSchema = Joi.object({
  status: Joi.string()
    .valid(...ADMIN_STATUS_UPDATES)
    .required(),
});

const adminPaymentUpdateSchema = Joi.object({
  amount: Joi.number().greater(0).required(),
  note: Joi.string().max(500).allow('', null).optional(),
});

const fraudFlagSchema = Joi.object({
  fraudFlag: Joi.boolean().required(),
  fraudReason: Joi.string().max(255).optional(),
});

module.exports = {
  cancelOrderSchema,
  adminStatusUpdateSchema,
  adminPaymentUpdateSchema,
  fraudFlagSchema,
};

const Joi = require('joi');

const previewSchema = Joi.object({
  userId: Joi.string().optional(),
  code: Joi.string().trim().uppercase().required(),
  orderSubtotal: Joi.number().min(0).required(),
});

const createSchema = Joi.object({
  code: Joi.string().trim().uppercase().required(),
  discountType: Joi.string().valid('percent', 'flat').required(),
  discountValue: Joi.number().positive().required(),
  minOrderAmount: Joi.number().min(0).default(0),
  maxDiscountAmount: Joi.number().min(0).allow(null),
  usageLimitTotal: Joi.number().min(0).allow(null),
  usageLimitPerUser: Joi.number().min(0).allow(null),
  validFrom: Joi.date().required(),
  validTo: Joi.date().required(),
  isActive: Joi.boolean().default(true),
});

const updateSchema = createSchema.fork(
  ['code', 'discountType', 'discountValue', 'validFrom', 'validTo'],
  (schema) => schema.optional(),
);

module.exports = { previewSchema, createSchema, updateSchema };

const Joi = require('joi');

const pincodeRangeSchema = Joi.object({
  from: Joi.number().integer().min(0).required(),
  to: Joi.number().integer().min(0).required(),
});

const listShippingRulesQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  country: Joi.string().trim().max(10),
});

const createShippingRuleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  country: Joi.string().trim().max(10).default('IN'),
  states: Joi.array().items(Joi.string().trim().max(100)).default([]),
  cities: Joi.array().items(Joi.string().trim().max(100)).default([]),
  pincodeRanges: Joi.array().items(pincodeRangeSchema).default([]),
  minWeight: Joi.number().min(0).default(0),
  maxWeight: Joi.number().min(0).allow(null),
  volumetricDivisor: Joi.number().min(1).default(5000),
  baseRate: Joi.number().min(0).required(),
  perKgRate: Joi.number().min(0).default(0),
  heavySurcharge: Joi.number().min(0).default(0),
  fragileSurcharge: Joi.number().min(0).default(0),
  freeShippingAbove: Joi.number().min(0).allow(null),
  codFee: Joi.number().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const updateShippingRuleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  country: Joi.string().trim().max(10),
  states: Joi.array().items(Joi.string().trim().max(100)),
  cities: Joi.array().items(Joi.string().trim().max(100)),
  pincodeRanges: Joi.array().items(pincodeRangeSchema),
  minWeight: Joi.number().min(0),
  maxWeight: Joi.number().min(0).allow(null),
  volumetricDivisor: Joi.number().min(1),
  baseRate: Joi.number().min(0),
  perKgRate: Joi.number().min(0),
  heavySurcharge: Joi.number().min(0),
  fragileSurcharge: Joi.number().min(0),
  freeShippingAbove: Joi.number().min(0).allow(null),
  codFee: Joi.number().min(0),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

module.exports = {
  listShippingRulesQuerySchema,
  createShippingRuleSchema,
  updateShippingRuleSchema,
};

const Joi = require('joi');

const listTaxQuerySchema = Joi.object({
  hsnCode: Joi.string().trim().pattern(/^\d{8}$/),
  status: Joi.string().valid('active', 'inactive'),
});

const createTaxSchema = Joi.object({
  hsnCode: Joi.string().trim().pattern(/^\d{8}$/).required(),
  rate: Joi.number().min(0).max(1).required(),
  minAmount: Joi.number().min(0).default(0),
  maxAmount: Joi.number().min(0).allow(null),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const updateTaxSchema = Joi.object({
  hsnCode: Joi.string().trim().pattern(/^\d{8}$/),
  rate: Joi.number().min(0).max(1),
  minAmount: Joi.number().min(0),
  maxAmount: Joi.number().min(0).allow(null),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

module.exports = {
  listTaxQuerySchema,
  createTaxSchema,
  updateTaxSchema,
};

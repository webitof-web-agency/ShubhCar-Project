const Joi = require('joi');

const summaryQuerySchema = Joi.object({
  threshold: Joi.number().integer().min(0).max(100000).default(5),
});

const listProductsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(120).allow(''),
  status: Joi.string().valid('active', 'inactive', 'draft', 'archived'),
  threshold: Joi.number().integer().min(0).max(100000),
});

const adjustStockSchema = Joi.object({
  productId: Joi.string().required(),
  type: Joi.string().valid('increase', 'decrease').default('increase'),
  quantity: Joi.number().integer().min(1).max(1000000).required(),
  note: Joi.string().trim().max(500).allow('', null),
});

module.exports = {
  summaryQuerySchema,
  listProductsQuerySchema,
  adjustStockSchema,
};

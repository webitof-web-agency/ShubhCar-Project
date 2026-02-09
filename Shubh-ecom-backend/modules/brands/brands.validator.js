const Joi = require('joi');

const listBrandsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(100),
  page: Joi.number().integer().min(1).default(1),
  search: Joi.string().trim().max(100).allow(''),
  type: Joi.string().valid('vehicle', 'manufacturer'),
});

const createBrandSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
  description: Joi.string().trim().max(500).allow('', null),
  logo: Joi.string().trim().max(500).allow('', null),
  type: Joi.string().valid('vehicle', 'manufacturer').required(),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const updateBrandSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
  description: Joi.string().trim().max(500).allow('', null),
  logo: Joi.string().trim().max(500).allow('', null),
  type: Joi.string().valid('vehicle', 'manufacturer'),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

module.exports = {
  listBrandsQuerySchema,
  createBrandSchema,
  updateBrandSchema,
};

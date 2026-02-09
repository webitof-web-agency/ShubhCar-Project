const Joi = require('joi');

const listModelsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(100),
  page: Joi.number().integer().min(1).default(1),
  search: Joi.string().trim().max(100).allow(''),
});

const createModelSchema = Joi.object({
  year: Joi.string().trim().min(1).max(50).required(),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const updateModelSchema = Joi.object({
  year: Joi.string().trim().min(1).max(50),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

module.exports = {
  listModelsQuerySchema,
  createModelSchema,
  updateModelSchema,
};

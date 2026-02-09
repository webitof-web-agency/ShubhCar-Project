const Joi = require('joi');

const listTagsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(100),
  page: Joi.number().integer().min(1).default(1),
  search: Joi.string().trim().max(100).allow(''),
});

const createTagSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
});

const updateTagSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
}).min(1);

module.exports = {
  listTagsQuerySchema,
  createTagSchema,
  updateTagSchema,
};

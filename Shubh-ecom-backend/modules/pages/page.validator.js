const Joi = require('joi');

const sectionSchema = Joi.object({
  type: Joi.string().trim().max(60).required(),
  data: Joi.alternatives().try(Joi.string(), Joi.object()).required(),
});

const listPagesQuerySchema = Joi.object({
  slug: Joi.string().trim().max(160),
  status: Joi.string().valid('draft', 'published', 'archived'),
});

const createPageSchema = Joi.object({
  title: Joi.string().trim().min(2).max(180).required(),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(180)
    .required(),
  status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
  sections: Joi.array().items(sectionSchema).default([]),
  metaTitle: Joi.string().trim().max(180).allow('', null),
  metaDescription: Joi.string().trim().max(300).allow('', null),
});

const updatePageSchema = Joi.object({
  title: Joi.string().trim().min(2).max(180),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(180),
  status: Joi.string().valid('draft', 'published', 'archived'),
  sections: Joi.array().items(sectionSchema),
  metaTitle: Joi.string().trim().max(180).allow('', null),
  metaDescription: Joi.string().trim().max(300).allow('', null),
}).min(1);

const resolvePageParamsSchema = Joi.object({
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(180)
    .required(),
});

module.exports = {
  listPagesQuerySchema,
  createPageSchema,
  updatePageSchema,
  resolvePageParamsSchema,
};

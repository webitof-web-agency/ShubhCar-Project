const Joi = require('joi');

const upsertSeoSchema = Joi.object({
  entityType: Joi.string()
    .valid('global', 'product', 'category', 'brand', 'page')
    .required(),
  entityId: Joi.string().allow('', null),
  slug: Joi.string().trim().max(180).allow('', null),
  metaTitle: Joi.string().trim().max(180).required(),
  metaDescription: Joi.string().trim().max(300).required(),
  canonicalUrl: Joi.string().trim().max(500).allow('', null),
  metaKeywords: Joi.array().items(Joi.string().trim().max(80)).default([]),
  ogImage: Joi.string().trim().max(500).allow('', null),
  robots: Joi.string().trim().max(80).allow('', null),
}).custom((value, helpers) => {
  if (value.entityType !== 'global' && !value.entityId) {
    return helpers.message('entityId required for non-global SEO');
  }
  return value;
});

const resolveSeoQuerySchema = Joi.object({
  slug: Joi.string().trim().max(180),
  entityType: Joi.string().valid('global', 'product', 'category', 'brand', 'page'),
  entityId: Joi.string(),
}).or('slug', 'entityType');

module.exports = {
  upsertSeoSchema,
  resolveSeoQuerySchema,
};

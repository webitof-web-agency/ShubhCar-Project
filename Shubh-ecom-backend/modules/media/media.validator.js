const Joi = require('joi');

const presignSchema = Joi.object({
  mimeType: Joi.string()
    .valid('image/jpeg', 'image/png', 'image/webp', 'image/svg+xml')
    .required(),
  folder: Joi.string().trim().max(80).default('misc'),
});

const createMediaSchema = Joi.object({
  key: Joi.string().trim().max(300).required(),
  bucket: Joi.string().trim().max(120).required(),
  url: Joi.string().trim().max(1000),
  mimeType: Joi.string().trim().max(120).required(),
  size: Joi.number().integer().min(1).required(),
  width: Joi.number().integer().min(1),
  height: Joi.number().integer().min(1),
  usedIn: Joi.array()
    .items(
      Joi.string().valid(
        'product',
        'category',
        'page',
        'review',
        'user',
        'seo',
        'branding',
      ),
    )
    .default([]),
});

const listMediaQuerySchema = Joi.object({
  usedIn: Joi.string().valid(
    'product',
    'category',
    'page',
    'review',
    'user',
    'seo',
    'branding',
  ),
  limit: Joi.number().integer().min(1).max(200).default(50),
  page: Joi.number().integer().min(1).default(1),
});

module.exports = {
  presignSchema,
  createMediaSchema,
  listMediaQuerySchema,
};

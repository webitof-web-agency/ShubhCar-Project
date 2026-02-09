const Joi = require('joi');

const listProductImagesQuerySchema = Joi.object({
  productId: Joi.string(),
  isPrimary: Joi.boolean(),
});

const createProductImageSchema = Joi.object({
  productId: Joi.string().required(),
  url: Joi.string().trim().uri().required(),
  altText: Joi.string().trim().max(200).allow('', null),
  isPrimary: Joi.boolean().default(false),
  sortOrder: Joi.number().integer().min(0).default(0),
});

const updateProductImageSchema = Joi.object({
  url: Joi.string().trim().uri(),
  altText: Joi.string().trim().max(200).allow('', null),
  isPrimary: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0),
}).min(1);

module.exports = {
  listProductImagesQuerySchema,
  createProductImageSchema,
  updateProductImageSchema,
};

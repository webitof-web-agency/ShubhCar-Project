const Joi = require('joi');

const base = {
  name: Joi.string().trim().min(2).max(100),
  slug: Joi.string().trim().lowercase().regex(/^[a-z0-9-]+$/),
  parentId: Joi.string().allow(null, ''),
  iconUrl: Joi.string().uri().allow(null, ''),
  imageUrl: Joi.string().uri().allow(null, ''),
  description: Joi.string().max(500).allow(null, ''),
  isActive: Joi.boolean(),
};

const createCategorySchema = Joi.object({
  name: base.name.required(),
  slug: base.slug.required(),
  parentId: base.parentId.optional(),
  iconUrl: base.iconUrl.optional(),
  imageUrl: base.imageUrl.optional(),
  description: base.description.optional(),
  isActive: base.isActive.optional(),
});

const updateCategorySchema = Joi.object({
  name: base.name.optional(),
  slug: base.slug.optional(),
  parentId: base.parentId.optional(),
  iconUrl: base.iconUrl.optional(),
  imageUrl: base.imageUrl.optional(),
  description: base.description.optional(),
  isActive: base.isActive.optional(),
}).min(1);

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};

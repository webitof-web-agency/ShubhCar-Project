const Joi = require('joi');

const baseListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
  search: Joi.string().trim().max(100).allow(''),
  status: Joi.string().valid('active', 'inactive'),
});

const attributeListQuerySchema = baseListQuerySchema;
const attributeCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  type: Joi.string().valid('dropdown', 'text').default('dropdown'),
  status: Joi.string().valid('active', 'inactive').default('active'),
});
const attributeUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  type: Joi.string().valid('dropdown', 'text'),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

const attributeValueListQuerySchema = baseListQuerySchema.keys({
  attributeId: Joi.string(),
});
const attributeValueCreateSchema = Joi.object({
  attributeId: Joi.string().required(),
  value: Joi.string().trim().min(1).max(120).required(),
  status: Joi.string().valid('active', 'inactive').default('active'),
});
const attributeValueUpdateSchema = Joi.object({
  attributeId: Joi.string(),
  value: Joi.string().trim().min(1).max(120),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

const brandListQuerySchema = baseListQuerySchema;
const brandCreateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  slug: Joi.string().trim().max(140),
  description: Joi.string().trim().max(500).allow('', null),
  logo: Joi.string().trim().max(500).required(),
  status: Joi.string().valid('active', 'inactive').default('active'),
});
const brandUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  slug: Joi.string().trim().max(140),
  description: Joi.string().trim().max(500).allow('', null),
  logo: Joi.string().trim().max(500),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

const modelListQuerySchema = baseListQuerySchema.keys({
  brandId: Joi.string(),
});
const modelCreateSchema = Joi.object({
  brandId: Joi.string().required(),
  name: Joi.string().trim().min(1).max(120).required(),
  slug: Joi.string().trim().max(140),
  status: Joi.string().valid('active', 'inactive').default('active'),
});
const modelUpdateSchema = Joi.object({
  brandId: Joi.string(),
  name: Joi.string().trim().min(1).max(120),
  slug: Joi.string().trim().max(140),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

const modelYearListQuerySchema = baseListQuerySchema.keys({
  modelId: Joi.string(),
  year: Joi.number().integer(),
});
const modelYearCreateSchema = Joi.object({
  modelId: Joi.string().required(),
  year: Joi.number().integer().required(),
  status: Joi.string().valid('active', 'inactive').default('active'),
});
const modelYearUpdateSchema = Joi.object({
  modelId: Joi.string(),
  year: Joi.number().integer(),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

const variantListQuerySchema = baseListQuerySchema.keys({
  modelYearId: Joi.string(),
});
const variantCreateSchema = Joi.object({
  modelYearId: Joi.string().required(),
  name: Joi.string().trim().min(1).max(120).required(),
  slug: Joi.string().trim().max(140),
  status: Joi.string().valid('active', 'inactive').default('active'),
});
const variantUpdateSchema = Joi.object({
  modelYearId: Joi.string(),
  name: Joi.string().trim().min(1).max(120),
  slug: Joi.string().trim().max(140),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

const yearListQuerySchema = baseListQuerySchema;
const yearCreateSchema = Joi.object({
  year: Joi.number().integer().required(),
  status: Joi.string().valid('active', 'inactive').default('active'),
});
const yearUpdateSchema = Joi.object({
  year: Joi.number().integer(),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

const vehicleListQuerySchema = baseListQuerySchema.keys({
  brandId: Joi.string(),
  modelId: Joi.string(),
  yearId: Joi.string(),
  attributeValueIds: Joi.string(),
});
const vehicleExportQuerySchema = Joi.object({
  format: Joi.string().valid('csv', 'xlsx').default('csv'),
});
const vehicleAvailableYearsQuerySchema = Joi.object({
  modelId: Joi.string().required(),
});
const vehicleAvailableAttributesQuerySchema = Joi.object({
  modelId: Joi.string().required(),
  yearId: Joi.string(),
});
const vehicleCreateSchema = Joi.object({
  vehicleCode: Joi.string().trim().uppercase().pattern(/^VEH-\d{6}$/),
  brandId: Joi.string().required(),
  modelId: Joi.string().required(),
  yearId: Joi.string().required(),
  variantName: Joi.string().trim().min(1).max(100).required(),
  attributeValueIds: Joi.array().items(Joi.string()).min(1).required(),
  status: Joi.string().valid('active', 'inactive').default('active'),
});
const vehicleUpdateSchema = Joi.object({
  vehicleCode: Joi.string().trim().uppercase().pattern(/^VEH-\d{6}$/),
  brandId: Joi.string(),
  modelId: Joi.string(),
  yearId: Joi.string(),
  variantName: Joi.string().trim().min(1).max(100),
  attributeValueIds: Joi.array().items(Joi.string()).min(1),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

module.exports = {
  attributeListQuerySchema,
  attributeCreateSchema,
  attributeUpdateSchema,
  attributeValueListQuerySchema,
  attributeValueCreateSchema,
  attributeValueUpdateSchema,
  brandListQuerySchema,
  brandCreateSchema,
  brandUpdateSchema,
  modelListQuerySchema,
  modelCreateSchema,
  modelUpdateSchema,
  modelYearListQuerySchema,
  modelYearCreateSchema,
  modelYearUpdateSchema,
  variantListQuerySchema,
  variantCreateSchema,
  variantUpdateSchema,
  yearListQuerySchema,
  yearCreateSchema,
  yearUpdateSchema,
  vehicleListQuerySchema,
  vehicleExportQuerySchema,
  vehicleAvailableYearsQuerySchema,
  vehicleAvailableAttributesQuerySchema,
  vehicleCreateSchema,
  vehicleUpdateSchema,
};

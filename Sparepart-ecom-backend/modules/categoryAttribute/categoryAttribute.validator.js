const Joi = require('joi');

const specType = Joi.string().valid('text', 'number', 'select', 'multiselect');
const optionList = Joi.array().items(Joi.string().trim().min(1));

exports.createCategoryAttributeSchema = Joi.object({
  categoryId: Joi.string().required(),
  name: Joi.string().trim().min(2).required(),
  code: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9_-]+$/)
    .required(),
  specType: specType.required(),
  isRequired: Joi.boolean().default(false),
  isFilterable: Joi.boolean().default(false),
  options: Joi.when('specType', {
    is: Joi.valid('select', 'multiselect'),
    then: optionList.min(1).required(),
    otherwise: Joi.array().max(0).default([]),
  }),
}).options({ allowUnknown: false });

exports.updateCategoryAttributeSchema = Joi.object({
  name: Joi.string().trim().min(2),
  code: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9_-]+$/),
  specType,
  isRequired: Joi.boolean(),
  isFilterable: Joi.boolean(),
  options: Joi.when('specType', {
    is: Joi.valid('select', 'multiselect'),
    then: optionList.min(1),
    otherwise: optionList,
  }),
}).min(1).options({ allowUnknown: false });

const Joi = require('joi');

const createEntrySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  subject: Joi.string().trim().max(200).allow('', null),
  message: Joi.string().trim().min(1).max(5000).required(),
  phone: Joi.string()
    .trim()
    .min(7)
    .max(20)
    .allow('', null),
});

const listEntriesQuerySchema = Joi.object({
  limit: Joi.alternatives().try(
    Joi.number().integer().min(1).max(100),
    Joi.string().valid('all'),
  ),
  page: Joi.number().integer().min(1).default(1),
  status: Joi.string().valid('new', 'read', 'replied'),
  startDate: Joi.date().iso().allow('', null),
  endDate: Joi.date().iso().allow('', null),
  search: Joi.string().trim().max(100).allow(''),
});

module.exports = {
  createEntrySchema,
  listEntriesQuerySchema,
};

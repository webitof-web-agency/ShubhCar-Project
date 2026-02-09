const Joi = require('joi');

const createEntrySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  subject: Joi.string().trim().max(200).allow('', null),
  message: Joi.string().trim().min(1).max(5000).required(),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\-()\s]{7,20}$/)
    .allow('', null),
});

const listEntriesQuerySchema = Joi.object({
  limit: Joi.alternatives().try(
    Joi.number().integer().min(1).max(100),
    Joi.string().valid('all'),
  ),
  page: Joi.number().integer().min(1).default(1),
  status: Joi.string().valid('new', 'read', 'replied'),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  search: Joi.string().trim().max(100).allow(''),
});

module.exports = {
  createEntrySchema,
  listEntriesQuerySchema,
};

const Joi = require('joi');

const listInvoicesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
  type: Joi.string().valid('invoice', 'credit_note'),
});

const pdfQuerySchema = Joi.object({
  download: Joi.boolean().truthy('true').falsy('false').default(false),
});

module.exports = {
  listInvoicesQuerySchema,
  pdfQuerySchema,
};

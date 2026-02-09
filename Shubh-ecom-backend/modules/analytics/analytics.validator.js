const Joi = require('joi');

const analyticsQuerySchema = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  threshold: Joi.number().integer().min(0).max(100000).default(5),
  range: Joi.string().valid('today', 'week', 'month', 'year', 'custom').default('month'),
});

module.exports = {
  analyticsQuerySchema,
};

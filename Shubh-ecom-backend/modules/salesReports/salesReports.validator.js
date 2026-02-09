const Joi = require('joi');

const summaryQuerySchema = Joi.object({
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});

const listSalesReportsQuerySchema = Joi.object({
  date: Joi.date().iso(),
});

const createSalesReportSchema = Joi.object({
  date: Joi.date().iso().required(),
  totalSales: Joi.number().min(0).default(0),
  totalOrders: Joi.number().integer().min(0).default(0),
  totalUnitsSold: Joi.number().integer().min(0).default(0),
  platformCommission: Joi.number().min(0).default(0),
});

const updateSalesReportSchema = Joi.object({
  date: Joi.date().iso(),
  totalSales: Joi.number().min(0),
  totalOrders: Joi.number().integer().min(0),
  totalUnitsSold: Joi.number().integer().min(0),
  platformCommission: Joi.number().min(0),
}).min(1);

module.exports = {
  summaryQuerySchema,
  listSalesReportsQuerySchema,
  createSalesReportSchema,
  updateSalesReportSchema,
};

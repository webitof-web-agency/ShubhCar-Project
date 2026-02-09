const Joi = require('joi');

const listInventoryLogsQuerySchema = Joi.object({
  productId: Joi.string(),
  changeType: Joi.string().valid(
    'increase',
    'decrease',
    'order',
    'cancel',
    'admin_adjust',
  ),
  referenceId: Joi.string().trim().max(120),
});

module.exports = {
  listInventoryLogsQuerySchema,
};

const Joi = require('joi');

const listUserActivityLogsQuerySchema = Joi.object({
  userId: Joi.string(),
  activityType: Joi.string().trim().max(100),
});

module.exports = {
  listUserActivityLogsQuerySchema,
};

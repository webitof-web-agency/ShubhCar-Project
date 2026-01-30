const Joi = require('joi');

const approveWholesaleSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required(),
  reason: Joi.when('action', {
    is: 'reject',
    then: Joi.string().min(5).required(),
    otherwise: Joi.forbidden(),
  }),
});

module.exports = { approveWholesaleSchema };

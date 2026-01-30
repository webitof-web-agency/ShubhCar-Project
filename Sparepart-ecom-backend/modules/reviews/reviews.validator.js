const Joi = require('joi');

const createReviewSchema = Joi.object({
  productId: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().max(150).allow('', null),
  comment: Joi.string().max(2000).allow('', null),
});

const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional(),
  title: Joi.string().max(150).allow('', null),
  comment: Joi.string().max(2000).allow('', null),
  status: Joi.string().valid('published', 'hidden', 'spam').optional(),
}).min(1);

module.exports = {
  createReviewSchema,
  updateReviewSchema,
};

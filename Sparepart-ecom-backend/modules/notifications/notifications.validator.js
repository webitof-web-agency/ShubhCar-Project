const Joi = require('joi');

const base = {
  userId: Joi.string().optional(),
  type: Joi.string().valid('email', 'sms', 'inapp').required(),
  audience: Joi.string().valid('user', 'vendor', 'admin').default('user'),
  title: Joi.string().max(200).required(),
  message: Joi.string().max(2000).required(),
  metadata: Joi.object().optional(),
  status: Joi.string().valid('unread', 'read').default('unread'),
};

const createNotificationSchema = Joi.object({
  userId: base.userId,
  type: base.type,
  audience: base.audience,
  title: base.title,
  message: base.message,
  metadata: base.metadata,
  status: base.status,
});

const updateNotificationSchema = Joi.object({
  title: base.title.optional(),
  message: base.message.optional(),
  metadata: base.metadata,
  status: base.status.optional(),
  audience: base.audience.optional(),
}).min(1);

const markAllSchema = Joi.object({
  audience: base.audience.optional(),
});

module.exports = {
  createNotificationSchema,
  updateNotificationSchema,
  markAllSchema,
};

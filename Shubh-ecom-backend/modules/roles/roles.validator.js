const Joi = require('joi');

const createRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  permissions: Joi.array().items(Joi.string().trim().max(120)).default([]),
});

const updateRoleSchema = Joi.object({
  name: Joi.string().trim().min(2).max(80),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  permissions: Joi.array().items(Joi.string().trim().max(120)),
}).min(1);

module.exports = {
  createRoleSchema,
  updateRoleSchema,
};

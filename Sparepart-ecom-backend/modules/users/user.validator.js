const Joi = require('joi');
const ROLES = require('../../constants/roles');

const registerUserSchema = Joi.object({
  firstName: Joi.string().min(2).required(),
  lastName: Joi.string().allow('', null).default(''),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional(),
  password: Joi.string().min(6).required(),
  role: Joi.string()
    .valid(ROLES.CUSTOMER, ROLES.VENDOR, ROLES.ADMIN)
    .default(ROLES.CUSTOMER),
  roleId: Joi.string().optional(),
  customerType: Joi.string().valid('retail', 'wholesale').default('retail'),
  wholesaleInfo: Joi.object().optional(),
}).or('email', 'phone');

const adminCreateSchema = Joi.object({
  firstName: Joi.string().min(2).required(),
  lastName: Joi.string().allow('', null).default(''),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional(),
  password: Joi.string().min(6).required(),
  roleId: Joi.string().optional(),
  status: Joi.string().valid('active', 'inactive', 'banned').default('active'),
}).or('email', 'phone');

const profileUpdateSchema = Joi.object({
  firstName: Joi.string().min(2),
  lastName: Joi.string().allow('', null),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional(),
  password: Joi.string().min(6),
}).min(1);

module.exports = { registerUserSchema, profileUpdateSchema, adminCreateSchema };

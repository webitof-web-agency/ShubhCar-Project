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
    .valid(ROLES.CUSTOMER,   ROLES.ADMIN)
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

const adminListQuerySchema = Joi.object({
  role: Joi.string().valid(ROLES.ADMIN, ROLES.CUSTOMER),
  status: Joi.string().valid('active', 'inactive', 'banned'),
  customerType: Joi.string().valid('retail', 'wholesale'),
  verificationStatus: Joi.string().valid(
    'not_required',
    'pending',
    'approved',
    'rejected',
  ),
  search: Joi.string().trim().max(100).allow(''),
  limit: Joi.number().integer().min(1).max(200).default(20),
  page: Joi.number().integer().min(1).default(1),
});

const adminExportQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'banned'),
  customerType: Joi.string().valid('retail', 'wholesale'),
  verificationStatus: Joi.string().valid(
    'not_required',
    'pending',
    'approved',
    'rejected',
  ),
  search: Joi.string().trim().max(100).allow(''),
  format: Joi.string().valid('csv', 'xlsx').default('csv'),
});

const adminStatusUpdateSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'banned').required(),
});

const adminUpdateSchema = Joi.object({
  firstName: Joi.string().min(2),
  lastName: Joi.string().allow('', null),
  email: Joi.string().email(),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional(),
  customerType: Joi.string().valid('retail', 'wholesale'),
  roleId: Joi.string(),
  status: Joi.string().valid('active', 'inactive', 'banned'),
}).min(1);

const adminForceResetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6),
  password: Joi.string().min(6),
}).or('newPassword', 'password');

const checkEmailAvailabilitySchema = Joi.object({
  email: Joi.string().email().allow('', null),
  excludeUserId: Joi.string().allow('', null),
});

const checkPhoneAvailabilitySchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .allow('', null),
  excludeUserId: Joi.string().allow('', null),
});

module.exports = {
  registerUserSchema,
  profileUpdateSchema,
  adminCreateSchema,
  adminListQuerySchema,
  adminExportQuerySchema,
  adminStatusUpdateSchema,
  adminUpdateSchema,
  adminForceResetPasswordSchema,
  checkEmailAvailabilitySchema,
  checkPhoneAvailabilitySchema,
};

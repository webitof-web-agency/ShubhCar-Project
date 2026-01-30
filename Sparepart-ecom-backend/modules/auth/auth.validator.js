const Joi = require('joi');

const registerSchema = Joi.object({
  firstName: Joi.string().min(2).required(),
  lastName: Joi.string().allow('', null),
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional(),
  password: Joi.string().min(6).required(),
  role: Joi.forbidden(),
  customerType: Joi.string().valid('retail', 'wholesale').default('retail'),
}).or('email', 'phone');

const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  identifier: Joi.string().required(),
});

const resetPasswordSchema = Joi.object({
  identifier: Joi.string().required(),
  otp: Joi.string().length(6).required(),
  newPassword: Joi.string().min(6).required(),
});

const sendPhoneOtpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required(),
});

const verifyPhoneOtpSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required(),
  otp: Joi.string().length(6).required(),
  firstName: Joi.string().min(2).optional(),
  lastName: Joi.string().allow('', null),
  customerType: Joi.string().valid('retail', 'wholesale').default('retail'),
});

const sendEmailOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

const verifyEmailOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required(),
  firstName: Joi.string().min(2).optional(),
  lastName: Joi.string().allow('', null),
  customerType: Joi.string().valid('retail', 'wholesale').default('retail'),
});

const googleAuthSchema = Joi.object({
  idToken: Joi.string().required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
  googleAuthSchema,
};

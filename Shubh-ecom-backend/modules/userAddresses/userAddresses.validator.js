const Joi = require('joi');

const addressPayload = {
  label: Joi.string().trim().max(50),
  fullName: Joi.string().trim().min(2).max(120),
  phone: Joi.string().trim().pattern(/^[0-9+\-()\s]{7,20}$/),
  line1: Joi.string().trim().min(2).max(200),
  line2: Joi.string().trim().max(200).allow('', null),
  city: Joi.string().trim().min(2).max(100),
  state: Joi.string().trim().min(2).max(100),
  postalCode: Joi.string().trim().min(3).max(20),
  country: Joi.string().trim().min(2).max(50).default('IN'),
  isDefaultShipping: Joi.boolean(),
  isDefaultBilling: Joi.boolean(),
};

const createUserAddressSchema = Joi.object({
  ...addressPayload,
  fullName: addressPayload.fullName.required(),
  phone: addressPayload.phone.required(),
  line1: addressPayload.line1.required(),
  city: addressPayload.city.required(),
  state: addressPayload.state.required(),
  postalCode: addressPayload.postalCode.required(),
});

const updateUserAddressSchema = Joi.object(addressPayload).min(1);

module.exports = {
  createUserAddressSchema,
  updateUserAddressSchema,
};

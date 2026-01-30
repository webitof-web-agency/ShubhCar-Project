const Joi = require('joi');

const createShipmentSchema = Joi.object({
  shippingProviderId: Joi.string().required(),
  trackingNumber: Joi.string().required(),
  trackingUrlFormat: Joi.string().uri().allow(null, ''),
  shippedAt: Joi.date().optional(),
  estimatedDeliveryDate: Joi.date().optional(),
  carrierName: Joi.string().max(120).optional(),
});

const updateShipmentSchema = Joi.object({
  shippingProviderId: Joi.string().optional(),
  trackingNumber: Joi.string().optional(),
  trackingUrlFormat: Joi.string().uri().allow(null, ''),
  estimatedDeliveryDate: Joi.date().optional(),
  deliveredAt: Joi.date().optional(),
  carrierName: Joi.string().max(120).optional(),
  status: Joi.string()
    .valid('shipped', 'in_transit', 'delivered', 'cancelled', 'returned')
    .optional(),
}).min(1);

module.exports = {
  createShipmentSchema,
  updateShipmentSchema,
};

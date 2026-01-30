const Joi = require('joi');

exports.createOrderItemSchema = Joi.object({
  orderId: Joi.string().required(),
  vendorId: Joi.string().optional(),
  productId: Joi.string().required(),

  sku: Joi.string().trim().required(),

  quantity: Joi.number().integer().min(1).required(),

  price: Joi.number().positive().required(), // price per unit
  discount: Joi.number().min(0).default(0),
  taxPercent: Joi.number().min(0).max(100).required(),
  taxAmount: Joi.number().min(0).required(),
  taxComponents: Joi.object({
    cgst: Joi.number().min(0).required(),
    sgst: Joi.number().min(0).required(),
    igst: Joi.number().min(0).required(),
  }).required(),
  taxableAmount: Joi.number().min(0).required(),

  total: Joi.number().positive().required(), // FINAL total (qty + tax - discount)
});

exports.updateOrderItemStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      'created',
      'confirmed',
      'packed',
      'shipped',
      'out_for_delivery',
      'delivered',
      'on_hold',
      'cancelled',
      'returned',
      'refunded',
    )
    .required(),
});

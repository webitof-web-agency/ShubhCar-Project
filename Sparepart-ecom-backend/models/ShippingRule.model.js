const mongoose = require('mongoose');

const pincodeRangeSchema = new mongoose.Schema(
  {
    from: { type: Number, required: true },
    to: { type: Number, required: true },
  },
  { _id: false },
);

const shippingRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    country: { type: String, default: 'IN', index: true },
    states: [{ type: String }],
    cities: [{ type: String }],
    pincodeRanges: [pincodeRangeSchema],
    minWeight: { type: Number, default: 0 },
    maxWeight: { type: Number, default: null },
    volumetricDivisor: { type: Number, default: 5000 },
    baseRate: { type: Number, required: true },
    perKgRate: { type: Number, default: 0 },
    heavySurcharge: { type: Number, default: 0 },
    fragileSurcharge: { type: Number, default: 0 },
    freeShippingAbove: { type: Number, default: null },
    codFee: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true },
);

shippingRuleSchema.index({ country: 1, status: 1 });
shippingRuleSchema.index({ states: 1 });

module.exports = mongoose.model('ShippingRule', shippingRuleSchema);

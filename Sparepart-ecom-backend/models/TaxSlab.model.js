const mongoose = require('mongoose');

const taxSlabSchema = new mongoose.Schema(
  {
    hsnCode: { type: String, required: true, index: true },
    rate: { type: Number, required: true }, // e.g. 0.18
    minAmount: { type: Number, default: 0 },
    maxAmount: { type: Number, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true },
);

taxSlabSchema.index({ hsnCode: 1, status: 1 });
taxSlabSchema.index({ hsnCode: 1, minAmount: 1, maxAmount: 1 });

module.exports = mongoose.model('TaxSlab', taxSlabSchema);

const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    changeType: {
      type: String,
      enum: ['increase', 'decrease', 'order', 'cancel', 'admin_adjust'],
      required: true,
      index: true,
    },
    quantityChanged: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    referenceId: { type: String },
    note: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

inventoryLogSchema.index({ productId: 1, createdAt: -1 });
inventoryLogSchema.index({ vendorId: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);

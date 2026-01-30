const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
  {
    orderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderItem',
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'vendor_confirmed', 'rejected', 'approved'],
      default: 'pending',
    },
  },
  { _id: false },
);

const returnRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: { type: [returnItemSchema], default: [] },
    status: {
      type: String,
      enum: ['pending', 'approved', 'vendor_confirmed', 'rejected', 'completed'],
      default: 'pending',
      index: true,
    },
    adminNote: { type: String, default: null },
    vendorNote: { type: String, default: null },
  },
  { timestamps: true },
);

returnRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });
returnRequestSchema.index({ orderId: 1, status: 1 });

module.exports = mongoose.model('ReturnRequest', returnRequestSchema);

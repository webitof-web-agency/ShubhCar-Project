const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrderItem',
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    shippingProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShippingProvider',
      default: null,
    },
    carrierName: { type: String, trim: true },
    trackingNumber: { type: String, default: null },
    trackingUrlFormat: { type: String },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    estimatedDeliveryDate: { type: Date },
    status: {
      type: String,
      enum: [
        'pending',
        'shipped',
        'in_transit',
        'delivered',
        'cancelled',
        'returned',
      ],
      default: 'pending',
      index: true,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            'pending',
            'shipped',
            'in_transit',
            'delivered',
            'cancelled',
            'returned',
          ],
          required: true,
        },
        at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

shipmentSchema.virtual('trackingUrl').get(function () {
  if (!this.trackingUrlFormat || !this.trackingNumber) return null;
  return this.trackingUrlFormat.replace(
    '{{trackingNumber}}',
    this.trackingNumber,
  );
});
shipmentSchema.set('toJSON', { virtuals: true });
shipmentSchema.set('toObject', { virtuals: true });
shipmentSchema.index({ orderItemId: 1, status: 1, createdAt: -1 });
shipmentSchema.index({ orderId: 1, vendorId: 1, createdAt: -1 });

module.exports = mongoose.model('Shipment', shipmentSchema);

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: false,  // Made optional for orders without vendors
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    sku: { type: String, immutable: true },
    hsnCode: { type: String, immutable: true },

    quantity: { type: Number, required: true, immutable: true },

    price: { type: Number, required: true, immutable: true }, // final unit price
    discount: { type: Number, default: 0, immutable: true },
    taxableAmount: { type: Number, default: 0, immutable: true },
    taxPercent: { type: Number, default: 0, immutable: true },
    taxAmount: { type: Number, required: true, immutable: true },
    taxComponents: {
      cgst: { type: Number, default: 0, immutable: true },
      sgst: { type: Number, default: 0, immutable: true },
      igst: { type: Number, default: 0, immutable: true },
    },
    taxMode: { type: String, enum: ['intra', 'inter'], immutable: true },

    shippingShare: { type: Number, default: 0, immutable: true },
    total: { type: Number, required: true, immutable: true },

    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'shipped',
        'delivered',
        'cancelled',
        'returned',
      ],
      default: 'pending',
    },
  },
  { timestamps: true },
);

orderItemSchema.index({ orderId: 1 });
orderItemSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
orderItemSchema.index({ productId: 1 });

const IMMUTABLE_FIELDS = [
  'orderId',
  'vendorId',
  'productId',
  'sku',
  'hsnCode',
  'quantity',
  'price',
  'discount',
  'taxableAmount',
  'taxPercent',
  'taxAmount',
  'taxComponents',
  'taxMode',
  'shippingShare',
  'total',
];

const guardImmutable = function (next) {
  const update = this.getUpdate() || {};
  const touched = new Set();
  const check = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    IMMUTABLE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(obj, field)) touched.add(field);
    });
  };

  check(update);
  ['$set', '$inc', '$unset'].forEach((op) => check(update[op]));

  // Support promise-based middlewares where next may be undefined.
  const done = typeof next === 'function' ? next : () => {};

  if (touched.size) {
    return done(
      new Error(
        `Immutable order item fields cannot be modified: ${[...touched].join(
          ', ',
        )}`,
      ),
    );
  }
  return done();
};

orderItemSchema.pre('updateOne', guardImmutable);
orderItemSchema.pre('updateMany', guardImmutable);
orderItemSchema.pre('findOneAndUpdate', guardImmutable);
orderItemSchema.pre('findByIdAndUpdate', guardImmutable);

module.exports = mongoose.model('OrderItem', orderItemSchema);

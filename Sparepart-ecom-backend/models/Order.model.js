const mongoose = require('mongoose');
const { ORDER_STATUS_LIST } = require('../constants/orderStatus');

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    shippingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAddress',
      required: true,
    },

    billingAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserAddress',
      required: true,
    },

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },

    totalItems: { type: Number, required: true, immutable: true },
    subtotal: { type: Number, required: true, immutable: true },
    taxAmount: { type: Number, default: 0, immutable: true },
    taxBreakdown: {
      cgst: { type: Number, default: 0, immutable: true },
      sgst: { type: Number, default: 0, immutable: true },
      igst: { type: Number, default: 0, immutable: true },
    },
    shippingFee: { type: Number, default: 0, immutable: true },
    discountAmount: { type: Number, default: 0, immutable: true },
    grandTotal: { type: Number, required: true, immutable: true },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      immutable: true,
    },
    couponCode: { type: String, immutable: true },

    paymentStatus: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    codPayments: [
      {
        status: {
          type: String,
          enum: ['pending', 'partially_paid', 'paid', 'failed', 'refunded'],
          default: 'paid',
        },
        amount: { type: Number, default: 0 },
        note: { type: String, default: '' },
        method: { type: String, default: 'cod' },
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    fraudFlag: { type: Boolean, default: false, index: true },
    fraudReason: { type: String, default: null },

    orderStatus: {
      type: String,
      enum: ORDER_STATUS_LIST,
      default: 'created',
    },

    paymentMethod: { type: String, immutable: true },

    placedAt: { type: Date, default: Date.now },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    shipment: {
      carrier: { type: String },
      trackingNumber: { type: String },
      shippedAt: { type: Date },
      estimatedDeliveryDate: { type: Date },
    },

    /* =====================
       SOFT DELETE
    ====================== */
    isDeleted: { type: Boolean, default: false, index: true },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  if (typeof next === 'function') next();
});

const IMMUTABLE_FINANCIAL_FIELDS = [
  'subtotal',
  'taxAmount',
  'taxBreakdown',
  'shippingFee',
  'discountAmount',
  'grandTotal',
  'totalItems',
  'paymentMethod',
  'orderNumber',
  'couponId',
  'couponCode',
];

const guardImmutable = function (next) {
  const update = this.getUpdate() || {};
  const touched = new Set();
  const check = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    IMMUTABLE_FINANCIAL_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(obj, field)) touched.add(field);
    });
  };

  check(update);
  ['$set', '$inc', '$unset'].forEach((op) => check(update[op]));

  if (touched.size) {
    return next(
      new Error(
        `Immutable order financial fields cannot be modified: ${[
          ...touched,
        ].join(', ')}`,
      ),
    );
  }
  return next();
};

orderSchema.pre('updateOne', guardImmutable);
orderSchema.pre('updateMany', guardImmutable);
orderSchema.pre('findOneAndUpdate', guardImmutable);
orderSchema.pre('findByIdAndUpdate', guardImmutable);

/* =====================
   PERFORMANCE INDEXES
===================== */
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, paymentStatus: 1 });
orderSchema.index({ placedAt: -1 });

module.exports = mongoose.model('Order', orderSchema);

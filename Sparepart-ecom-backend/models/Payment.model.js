const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    /* =====================
       CORE REFERENCES
    ====================== */
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },

    /* =====================
       GATEWAY INFO
    ====================== */
    paymentGateway: {
      type: String,
      enum: ['stripe', 'razorpay'],
      required: true,
    },

    transactionId: {
      type: String, // gateway payment id
      sparse: true,
    },

    gatewayOrderId: {
      type: String, // stripe intent id / razorpay order id
      sparse: true,
    },

    /* =====================
       MONEY
    ====================== */
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* =====================
       STATUS (STRICT)
    ====================== */
    status: {
      type: String,
      enum: [
        'created', // intent created
        'success', // payment captured
        'failed', // payment failed
        'refunded', // fully refunded
        'partially_refunded', // partial refund
        'manual_review', // amount mismatch / suspicious
      ],
      default: 'created',
    },

    /* =====================
       SAFETY / AUDIT
    ====================== */
    suspicious: {
      type: Boolean,
      default: false,
      index: true,
    },

    failureReason: {
      type: String,
    },

    metadata: {
      type: Object, // orderId, retry flags, etc
    },

    gatewayResponse: {
      type: Object, // raw gateway response
    },

    rawWebhook: {
      type: Object, // raw webhook payload (legal audit)
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/* =====================================================
   🔐 CRITICAL INDEXES (DO NOT REMOVE)
===================================================== */

// ✅ Only ONE open payment per order per gateway
paymentSchema.index(
  { orderId: 1, paymentGateway: 1, status: 1 },
  {
    name: 'order_gateway_status_idx',
    unique: true,
    partialFilterExpression: { status: 'created' },
  },
);

// ✅ Fast reconciliation queries
paymentSchema.index(
  { status: 1, createdAt: 1 },
  { name: 'reconciliation_idx' },
);

// ✅ Refund safety
paymentSchema.index({ transactionId: 1, refundAmount: 1 });
paymentSchema.index({ orderId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);

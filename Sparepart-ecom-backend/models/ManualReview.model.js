const mongoose = require('mongoose');

const ManualReviewSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['payment_mismatch', 'gateway_anomaly'],
      required: true,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    gateway: String,

    expectedAmount: Number,
    receivedAmount: Number,

    status: {
      type: String,
      enum: ['pending', 'resolved', 'rejected'],
      default: 'pending',
      index: true,
    },

    resolutionNote: String,

    resolvedBy: mongoose.Schema.Types.ObjectId,
    resolvedAt: Date,
  },
  { timestamps: true },
);

ManualReviewSchema.index({ status: 1, createdAt: -1 });
ManualReviewSchema.index({ orderId: 1, paymentId: 1 });

module.exports = mongoose.model('ManualReview', ManualReviewSchema);

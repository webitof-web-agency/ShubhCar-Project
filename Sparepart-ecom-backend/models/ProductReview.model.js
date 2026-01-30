const mongoose = require('mongoose');

const productReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String },
    comment: { type: String },
    status: {
      type: String,
      enum: ['published', 'hidden', 'spam'],
      default: 'published',
      index: true,
    },
  },
  { timestamps: true },
);

productReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });
productReviewSchema.index({ productId: 1, status: 1 });

module.exports = mongoose.model('ProductReview', productReviewSchema);

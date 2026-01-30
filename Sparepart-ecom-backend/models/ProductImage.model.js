const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    url: { type: String, required: true },
    altText: String,
    isPrimary: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

productImageSchema.index(
  { productId: 1, isPrimary: 1 },
  { unique: true, partialFilterExpression: { isPrimary: true, isDeleted: false } },
);

productImageSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  // No need for callback; returning synchronously avoids "next is not a function" errors
});

module.exports = mongoose.model('ProductImage', productImageSchema);

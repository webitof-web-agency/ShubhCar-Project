const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    cartId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cart',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true },
    priceType: { type: String, enum: ['retail', 'wholesale'], required: true },
    priceAtTime: { type: Number, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

cartItemSchema.index({ cartId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('CartItem', cartItemSchema);

const mongoose = require('mongoose');
const ProductAttribute = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    specName: { type: String, required: true },
    specType: {
      type: String,
      enum: ['text', 'number', 'select', 'multiselect'],
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ProductAttribute', ProductAttribute);

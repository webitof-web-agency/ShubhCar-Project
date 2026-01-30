const mongoose = require('mongoose');

const productAttributeValueSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    attributeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductAttribute',
      required: true,
      index: true,
    },

    valueText: String,
    valueNumber: Number,
    valueSelect: String,
    valueMultiSelect: [String],
  },
  { timestamps: true },
);

productAttributeValueSchema.index(
  { productId: 1, attributeId: 1 },
  { unique: true },
);

module.exports = mongoose.model(
  'ProductAttributeValue',
  productAttributeValueSchema,
);

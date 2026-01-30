const mongoose = require('mongoose');

const productCompatibilitySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
      index: true,
    },
    vehicleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  'ProductCompatibility',
  productCompatibilitySchema,
);

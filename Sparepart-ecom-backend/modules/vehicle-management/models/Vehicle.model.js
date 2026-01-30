const mongoose = require('mongoose');
const { generateVehicleCode } = require('../../../utils/numbering');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleCode: {
      type: String,
      unique: true,
      uppercase: true,
      sparse: true,
      index: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    modelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleModel',
      required: true,
      index: true,
    },
    yearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleYear',
      required: true,
      index: true,
    },
    variantName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    variantNameNormalized: {
      type: String,
      required: true,
      index: true,
    },
    attributeValueIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VehicleAttributeValue',
        index: true,
      },
    ],
    attributeSignature: {
      type: String,
      required: true,
      index: true,
    },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

vehicleSchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});

vehicleSchema.pre('save', async function () {
  if (!this.vehicleCode) {
    this.vehicleCode = await generateVehicleCode();
  }
});

vehicleSchema.index(
  {
    brandId: 1,
    modelId: 1,
    yearId: 1,
    variantNameNormalized: 1,
    attributeSignature: 1,
  },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

module.exports = mongoose.model('Vehicle', vehicleSchema);

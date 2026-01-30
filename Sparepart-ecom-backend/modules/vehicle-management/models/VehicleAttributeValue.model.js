const mongoose = require('mongoose');

const vehicleAttributeValueSchema = new mongoose.Schema(
  {
    attributeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleAttribute',
      required: true,
      index: true,
    },
    value: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

vehicleAttributeValueSchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});

vehicleAttributeValueSchema.index(
  { attributeId: 1, value: 1 },
  { unique: true },
);

module.exports = mongoose.model(
  'VehicleAttributeValue',
  vehicleAttributeValueSchema,
);

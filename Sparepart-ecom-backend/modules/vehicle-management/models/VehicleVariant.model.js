const mongoose = require('mongoose');

const vehicleVariantSchema = new mongoose.Schema(
  {
    modelYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleModelYear',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

vehicleVariantSchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});

vehicleVariantSchema.index({ modelYearId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('VehicleVariant', vehicleVariantSchema);

const mongoose = require('mongoose');

const vehicleModelYearSchema = new mongoose.Schema(
  {
    modelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleModel',
      required: true,
      index: true,
    },
    year: { type: Number, required: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

vehicleModelYearSchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});

vehicleModelYearSchema.index({ modelId: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('VehicleModelYear', vehicleModelYearSchema);

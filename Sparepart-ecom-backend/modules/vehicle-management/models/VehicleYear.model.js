const mongoose = require('mongoose');

const vehicleYearSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, unique: true, index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

vehicleYearSchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});

module.exports = mongoose.model('VehicleYear', vehicleYearSchema);

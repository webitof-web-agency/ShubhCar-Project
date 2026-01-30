const mongoose = require('mongoose');

const vehicleAttributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    type: { type: String, enum: ['dropdown', 'text'], default: 'dropdown' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

vehicleAttributeSchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});

vehicleAttributeSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('VehicleAttribute', vehicleAttributeSchema);

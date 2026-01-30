const mongoose = require('mongoose');
const slugify = require('slugify');

const vehicleModelSchema = new mongoose.Schema(
  {
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    image: { type: String },
    slug: { type: String, unique: true, lowercase: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

vehicleModelSchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});

vehicleModelSchema.pre('save', function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

vehicleModelSchema.index({ brandId: 1, status: 1 });
vehicleModelSchema.index({ name: 1, brandId: 1 }, { unique: true });

module.exports = mongoose.model('VehicleModel', vehicleModelSchema);

const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, unique: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
        description: { type: String },
        logo: { type: String }, // URL to image
        type: { type: String, enum: ['vehicle', 'manufacturer'], required: true },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true },
);

brandSchema.pre(/^find/, function () {
    this.where({ isDeleted: false });
});

module.exports = mongoose.model('Brand', brandSchema);

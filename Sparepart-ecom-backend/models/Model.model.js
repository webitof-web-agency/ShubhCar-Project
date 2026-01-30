const mongoose = require('mongoose');

const modelSchema = new mongoose.Schema(
    {
        year: { type: String, required: true, trim: true },
        slug: { type: String, unique: true, lowercase: true },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true },
);

modelSchema.pre(/^find/, function () {
    this.where({ isDeleted: false });
});

module.exports = mongoose.model('Model', modelSchema);

const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, unique: true },
        slug: { type: String, required: true, unique: true, lowercase: true },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true },
);

tagSchema.pre(/^find/, function () {
    this.where({ isDeleted: false });
});

module.exports = mongoose.model('Tag', tagSchema);

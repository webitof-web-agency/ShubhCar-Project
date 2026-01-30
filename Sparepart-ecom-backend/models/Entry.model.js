const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        subject: { type: String, trim: true },
        message: { type: String, required: true },
        phone: { type: String, trim: true },
        status: {
            type: String,
            enum: ['new', 'read', 'replied'],
            default: 'new',
        },
        ip: { type: String },
        userAgent: { type: String },
        browser: { type: String },
        os: { type: String },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        isGuest: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true },
);

entrySchema.pre(/^find/, function () {
    this.where({ isDeleted: false });
});

module.exports = mongoose.model('Entry', entrySchema);

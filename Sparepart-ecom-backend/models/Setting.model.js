const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
    {
        group: {
            type: String,
            required: true,
            index: true,
            enum: ['general', 'store', 'payment', 'email', 'tax', 'shipping', 'social', 'seo', 'orders', 'invoice', 'storage', 'products', 'vehicles', 'categories', 'subcategories'],
        },
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        value: {
            type: mongoose.Schema.Types.Mixed, // Can be string, number, boolean, or object
            default: null,
        },
        isPublic: {
            type: Boolean,
            default: false, // If true, exposed to public API (e.g., store name)
        },
        description: { type: String },
    },
    { timestamps: true },
);

module.exports = mongoose.model('Setting', settingSchema);

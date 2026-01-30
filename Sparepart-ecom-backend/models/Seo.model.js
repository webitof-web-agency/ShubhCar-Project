const mongoose = require('mongoose');

const SeoSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['global', 'page', 'product', 'category'],
      required: true,
      index: true,
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    metaTitle: { type: String, required: true },
    metaDescription: { type: String, required: true },
    metaKeywords: [String],

    canonicalUrl: String,

    ogTitle: String,
    ogDescription: String,
    ogImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
    },

    twitterTitle: String,
    twitterDescription: String,
    twitterImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
    },

    noIndex: { type: Boolean, default: false },
    noFollow: { type: Boolean, default: false },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Prevent duplicate SEO per entity
SeoSchema.index({ entityType: 1, entityId: 1 }, { unique: true });

module.exports = mongoose.model('Seo', SeoSchema);

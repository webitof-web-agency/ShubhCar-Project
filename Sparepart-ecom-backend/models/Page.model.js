const mongoose = require('mongoose');

const PageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: String, // optional short intro

    sections: [
      {
        type: {
          type: String,
          enum: ['hero', 'text', 'image', 'image_text', 'list', 'faq', 'cta'],
          required: true,
        },

        data: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
      },
    ],

    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },

    seoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seo',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    publishedAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model('Page', PageSchema);

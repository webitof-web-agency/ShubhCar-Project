const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    bucket: { type: String, required: true },
    url: { type: String, required: true },

    mimeType: { type: String, required: true },
    size: { type: Number, required: true },

    width: Number,
    height: Number,

    usedIn: [
      {
        type: String,
        enum: ['product', 'category', 'page', 'review', 'user', 'seo', 'branding'],
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

MediaSchema.index({ createdAt: -1 });
MediaSchema.index({ usedIn: 1 });

module.exports = mongoose.model('Media', MediaSchema);

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    type: {
      type: String,
      enum: ['email', 'sms', 'inapp'],
      required: true,
      index: true,
    },
    audience: {
      type: String,
      enum: ['user', 'vendor', 'admin'],
      default: 'user',
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Object },
    status: { type: String, default: 'unread', index: true },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ audience: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, audience: 1, status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);

const mongoose = require('mongoose');

const userActivityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    activityType: { type: String, required: true },
    metadata: { type: Object, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = mongoose.model('UserActivityLog', userActivityLogSchema);

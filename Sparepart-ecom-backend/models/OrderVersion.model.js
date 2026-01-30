const mongoose = require('mongoose');

const OrderVersionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    snapshot: {
      type: Object, // full order snapshot
      required: true,
    },
    reason: {
      type: String, // created | status_change | payment | refund | admin_update
      required: true,
    },
    actor: {
      type: {
        type: String, // user | admin | system
        default: 'system',
      },
      actorId: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

OrderVersionSchema.index({ orderId: 1, version: 1 }, { unique: true });
OrderVersionSchema.index({ orderId: 1, createdAt: -1 });

module.exports = mongoose.model('OrderVersion', OrderVersionSchema);

const mongoose = require('mongoose');

const EmailDispatchSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Types.ObjectId, index: true },
    type: {
      type: String,
      enum: [
        'ORDER_CONFIRMED',
        'ORDER_SHIPPED',
        'ORDER_DELIVERED',
        'ORDER_CANCELLED',
      ],
      index: true,
    },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

EmailDispatchSchema.index({ orderId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('EmailDispatch', EmailDispatchSchema);

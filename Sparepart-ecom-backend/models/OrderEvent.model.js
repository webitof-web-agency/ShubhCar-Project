const mongoose = require('mongoose');

const OrderEventSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    type: {
      type: String, // CREATED, PAID, CANCELLED, SHIPPED, REFUNDED
      required: true,
    },
    previousStatus: String,
    newStatus: String,
    actor: {
      type: {
        type: String, // user | admin | system
        default: 'system',
      },
      actorId: mongoose.Schema.Types.ObjectId,
    },
    meta: {
      type: Object,
    },
    noteType: {
      type: String,
      enum: ['system', 'private', 'customer'],
      default: 'system',
    },
    noteContent: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
);

OrderEventSchema.index({ orderId: 1, createdAt: -1 });
OrderEventSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('OrderEvent', OrderEventSchema);

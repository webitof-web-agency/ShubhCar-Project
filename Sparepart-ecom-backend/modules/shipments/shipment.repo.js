const Shipment = require('../../models/Shipment.model');

class ShipmentRepository {
  create(data) {
    return Shipment.create(data);
  }

  findByOrderItem(orderItemId) {
    return Shipment.findOne({ orderItemId }).lean();
  }
  findByOrder(orderId) {
    return Shipment.find({ orderId }).lean();
  }

  findById(id) {
    return Shipment.findById(id).lean();
  }

  list(filter = {}) {
    return Shipment.find(filter).sort({ createdAt: -1 }).lean();
  }

  remove(id) {
    return Shipment.findByIdAndDelete(id).lean();
  }

  updateStatus(orderItemId, update) {
    return Shipment.findOneAndUpdate({ orderItemId }, update, {
      new: true,
    }).lean();
  }

  updateStatusWithHistory(orderItemId, update, nextStatus) {
    const updateDoc = { $set: update };
    if (nextStatus) {
      updateDoc.$push = {
        statusHistory: { status: nextStatus, at: new Date() },
      };
    }

    return Shipment.findOneAndUpdate({ orderItemId }, updateDoc, {
      new: true,
    }).lean();
  }
}

module.exports = new ShipmentRepository();

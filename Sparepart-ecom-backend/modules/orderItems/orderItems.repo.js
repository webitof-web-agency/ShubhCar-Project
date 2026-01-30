// backend/modules/orderItems/orderItems.repo.js
const OrderItem = require('../../models/OrderItem.model');

class OrderItemRepository {
  createMany(items, session) {
    return OrderItem.insertMany(items, { session });
  }

  findByOrderId(orderId, session) {
    const query = OrderItem.find({ orderId });
    if (session) query.session(session);
    return query.lean();
  }

  findByVendor(vendorId, filters = {}) {
    return OrderItem.find({ vendorId, ...filters }).lean();
  }

  findById(id) {
    return OrderItem.findById(id);
  }

  updateStatus(id, status) {
    return OrderItem.findByIdAndUpdate(id, { status }, { new: true });
  }

  updateStatusByOrder(orderId, status, session) {
    return OrderItem.updateMany({ orderId }, { status }, { session });
  }
}

module.exports = new OrderItemRepository();

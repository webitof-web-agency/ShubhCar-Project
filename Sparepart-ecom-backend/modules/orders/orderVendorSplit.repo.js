const OrderVendorSplit = require('../../models/OrderVendorSplit.model');

class OrderVendorSplitRepo {
  insertMany(data, session) {
    return OrderVendorSplit.insertMany(data, { session });
  }

  findByOrder(orderId) {
    return OrderVendorSplit.find({ orderId }).lean();
  }

  updateStatusByOrder(orderId, payoutStatus) {
    return OrderVendorSplit.updateMany({ orderId }, { payoutStatus });
  }
}

module.exports = new OrderVendorSplitRepo();

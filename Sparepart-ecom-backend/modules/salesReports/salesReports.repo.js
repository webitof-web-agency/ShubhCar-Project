const mongoose = require('mongoose');
const Order = require('../../models/Order.model');
const OrderItem = require('../../models/OrderItem.model');
const OrderVendorSplit = require('../../models/OrderVendorSplit.model');
const SalesReport = require('../../models/SalesReport.model');

class SalesReportsRepo {
  create(data) {
    return SalesReport.create(data);
  }

  list(filter = {}) {
    return SalesReport.find(filter).sort({ date: -1 }).lean();
  }

  findById(id) {
    return SalesReport.findById(id).lean();
  }

  update(id, data) {
    return SalesReport.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  remove(id) {
    return SalesReport.findByIdAndDelete(id).lean();
  }

  async summary({ from, to }) {
    const match = {};
    if (from || to) match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);

    const ordersAgg = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$grandTotal' },
        },
      },
    ]);

    const itemsAgg = await OrderItem.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalItems: { $sum: '$quantity' },
          totalItemRevenue: { $sum: '$total' },
        },
      },
    ]);

    const vendorAgg = await OrderVendorSplit.aggregate([
      { $match: { ...(match.createdAt ? { createdAt: match.createdAt } : {}) } },
      {
        $group: {
          _id: '$vendorId',
          vendorSubtotal: { $sum: '$vendorSubtotal' },
          vendorTax: { $sum: '$vendorTax' },
          vendorShippingShare: { $sum: '$vendorShippingShare' },
          platformCommission: { $sum: '$platformCommission' },
          finalPayout: { $sum: '$finalPayout' },
        },
      },
    ]);

    return {
      orders: ordersAgg[0] || { totalOrders: 0, totalRevenue: 0 },
      items: itemsAgg[0] || { totalItems: 0, totalItemRevenue: 0 },
      vendors: vendorAgg,
    };
  }
}

module.exports = new SalesReportsRepo();

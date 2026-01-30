const mongoose = require('mongoose');
const returnRepo = require('./return.repo');
const orderRepo = require('../orders/order.repo');
const orderItemsRepo = require('../orderItems/orderItems.repo');
const { error } = require('../../utils/apiResponse');
const vendorRepo = require('../vendors/vendor.repo');
const inventoryService = require('../inventory/inventory.service');
const OrderItem = require('../../models/OrderItem.model');
const ROLES = require('../../constants/roles');

class ReturnService {
  async requestReturn({ user, payload }) {
    const order = await orderRepo.findById(payload.orderId);
    if (!order) error('Order not found', 404);
    if (String(order.userId) !== String(user.id)) error('Forbidden', 403);

    const items = await orderItemsRepo.findByOrderId(payload.orderId);
    const itemsMap = new Map(items.map((i) => [String(i._id), i]));

    const normalizedItems = payload.items.map((i) => {
      const oi = itemsMap.get(String(i.orderItemId));
      if (!oi) error('Invalid order item', 400);
      if (i.quantity <= 0 || i.quantity > oi.quantity) {
        error('Invalid return quantity', 400);
      }
      return {
        orderItemId: oi._id,
        vendorId: i.vendorId || oi.vendorId,
        quantity: i.quantity,
        reason: i.reason,
        status: 'pending',
      };
    });

    return returnRepo.create({
      orderId: order._id,
      userId: user.id,
      items: normalizedItems,
    });
  }

  async adminDecision({ admin, id, payload }) {
    const existing = await returnRepo.findById(id);
    if (!existing) error('Return request not found', 404);

    const updated = await returnRepo.update(id, {
      status: payload.status,
      adminNote: payload.adminNote || null,
    });

    return updated;
  }

  async vendorConfirm({ vendorUser, id, payload }) {
    const existing = await returnRepo.findById(id);
    if (!existing) error('Return request not found', 404);

    // Vendors can confirm only if they own at least one item
    const vendor = await vendorRepo.getByOwner(vendorUser.id);
    if (!vendor) error('Vendor not found for user', 403);
    const ownsItem = existing.items.some(
      (i) => String(i.vendorId) === String(vendor._id),
    );
    if (!ownsItem) error('Forbidden', 403);

    const updated = await returnRepo.update(id, {
      status: 'vendor_confirmed',
      vendorNote: payload.vendorNote || null,
    });
    return updated;
  }

  async complete({ admin, id, payload, context = {} }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existing = await returnRepo.findById(id, session);
      if (!existing) error('Return request not found', 404);

      // Load order items for stock reconciliation
      const orderItems = await orderItemsRepo.findByOrderId(
        existing.orderId,
        session,
      );
      const itemMap = new Map(orderItems.map((i) => [String(i._id), i]));

      for (const ret of existing.items) {
        const oi = itemMap.get(String(ret.orderItemId));
        if (!oi) error('Return item invalid', 400);
        await inventoryService.release(
          oi.productId,
          ret.quantity,
          session,
          { ...context, orderId: existing.orderId },
        );
        await OrderItem.findByIdAndUpdate(
          oi._id,
          { status: 'returned' },
          { session },
        );
      }

      const updated = await returnRepo.update(
        id,
        {
          status: 'completed',
          adminNote: payload.adminNote || existing.adminNote,
        },
        { session },
      );

      await session.commitTransaction();
      return updated;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  list(filter = {}) {
    return returnRepo.list(filter);
  }

  async get(id, user) {
    const existing = await returnRepo.findById(id);
    if (!existing) error('Return request not found', 404);
    if (
      user.role !== ROLES.ADMIN &&
      String(existing.userId) !== String(user.id) &&
      !(user.role === ROLES.VENDOR &&
        existing.items.some((i) => String(i.vendorId) === String(user.id)))
    ) {
      error('Forbidden', 403);
    }
    return existing;
  }
}

module.exports = new ReturnService();

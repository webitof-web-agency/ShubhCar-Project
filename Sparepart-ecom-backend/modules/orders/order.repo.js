const mongoose = require('mongoose');
const Order = require('../../models/Order.model');
const OrderItem = require('../../models/OrderItem.model');
const orderVersionRepo = require('./orderVersion.repo');
const orderEventRepo = require('./orderEvent.repo');

const ORDER_STATUS_TO_ITEM_STATUS = {
  created: 'pending',
  pending_payment: 'pending',
  confirmed: 'confirmed',
  shipped: 'shipped',
  out_for_delivery: 'shipped',
  delivered: 'delivered',
  on_hold: 'pending',
  failed: 'pending',
  cancelled: 'cancelled',
  returned: 'returned',
  refunded: 'returned',
};

class OrderRepository {
  createOrder(order, session) {
    return Order.create([order], { session });
  }

  createItems(items, session) {
    return OrderItem.insertMany(items, { session });
  }

  findItemsByOrder(orderId, session) {
    const query = OrderItem.find({ orderId });
    if (session) query.session(session);
    return query.lean();
  }

  findItemsByOrderWithDetails(orderId, session) {
    const query = OrderItem.find({ orderId })
      .populate('productId', 'name');
    if (session) query.session(session);
    return query.lean();
  }

  findById(id, session) {
    const query = Order.findById(id);
    if (session) query.session(session);
    return query;
  }

  findByIdLean(id, session) {
    const query = Order.findById(id);
    if (session) query.session(session);
    return query.lean();
  }

  findAccessible(id, user, session) {
    if (user.role === 'admin') {
      return this.findByIdLean(id, session);
    }
    const query = Order.findOne({ _id: id, userId: user.id });
    if (session) query.session(session);
    return query.lean();
  }

  updateById(id, update, session) {
    return Order.findByIdAndUpdate(
      id,
      update,
      {
        new: true,
        session,
      },
    );
  }

  updateStatus(id, update, session) {
    return Order.findByIdAndUpdate(
      id,
      update,
      {
        new: true,
        session,
      },
    );
  }

  updateItemsStatusByOrder(orderId, status, session) {
    const query = OrderItem.updateMany({ orderId }, { status });
    if (session) query.session(session);
    return query;
  }

  findByIdAndUpdate(id, update) {
    return Order.findByIdAndUpdate(id, update, { new: true });
  }

  exists(orderId) {
    return Order.exists({ _id: orderId });
  }

  async updateWithVersion({ orderId, mutate, reason, actor }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new Error('Order not found');

      const before = order.toObject();

      // apply mutation
      await mutate(order);

      await order.save({ session });

      await orderVersionRepo.createVersion({
        orderId,
        snapshot: order.toObject(),
        reason,
        actor,
        session,
      });

      await orderEventRepo.log(
        {
          orderId,
          previousStatus: before.orderStatus,
          newStatus: order.orderStatus,
          type: reason.toUpperCase(),
          actor,
        },
        session,
      );

      await session.commitTransaction();
      return order;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  async applyOrderMutation({ orderId, mutateFn, reason, actor, session }) {
    const ownsSession = !session;
    const topologyType =
      mongoose.connection?.client?.topology?.description?.type || null;
    const supportsTransactions = topologyType && topologyType !== 'Single';

    const txSession =
      supportsTransactions && ownsSession
        ? await mongoose.startSession()
        : supportsTransactions
          ? session
          : null;

    const shouldManageTx =
      supportsTransactions && txSession && (ownsSession || !txSession.inTransaction());

    if (shouldManageTx) txSession.startTransaction();

    try {
      const orderQuery = Order.findById(orderId);
      if (txSession) orderQuery.session(txSession);
      const order = await orderQuery;
      if (!order) throw new Error('Order not found');

      // HARD LOCK ENFORCEMENT
      if (order.isLocked && reason === 'admin_update') {
        throw new Error('Locked order cannot be modified');
      }

      const beforeStatus = order.orderStatus;

      // apply controlled mutation
      await mutateFn(order);

      // LOCK AFTER PAYMENT
      if (reason === 'payment') {
        order.isLocked = true;
      }

      await order.save(txSession ? { session: txSession } : undefined);

      if (beforeStatus !== order.orderStatus) {
        const mappedStatus = ORDER_STATUS_TO_ITEM_STATUS[order.orderStatus];
        if (mappedStatus) {
          await this.updateItemsStatusByOrder(orderId, mappedStatus, txSession || undefined);
        }
      }

      await orderVersionRepo.createVersion({
        orderId,
        snapshot: order.toObject(),
        reason,
        actor,
        session: txSession || undefined,
      });

      await orderEventRepo.log(
        {
          orderId,
          previousStatus: beforeStatus,
          newStatus: order.orderStatus,
          actor,
          type: reason.toUpperCase(),
        },
        txSession || undefined,
      );

      if (shouldManageTx) {
        await txSession.commitTransaction();
      }

      return order;
    } catch (e) {
      if (shouldManageTx && txSession?.inTransaction()) {
        await txSession.abortTransaction();
      }
      throw e;
    } finally {
      if (ownsSession && txSession) txSession.endSession();
    }
  }
}

module.exports = new OrderRepository();

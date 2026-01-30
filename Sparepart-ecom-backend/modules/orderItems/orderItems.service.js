// backend/modules/orderItems/orderItems.service.js

const repo = require('./orderItems.repo'); // ✅ FIXED filename
const cache = require('../../cache/orderItem.cache');
const orderRepo = require('../orders/order.repo');
const { PAYMENT_STATUS } = require('../../constants/paymentStatus');
const { error } = require('../../utils/apiResponse');
const { ORDER_ITEM_TRANSITIONS } = require('../../constants/orderStatus');

/*
  FIX: ORDER_STATUS was incorrectly used as a transition map.
  We KEEP the logic but define a proper transition table
  without removing anything else.
*/

exports.createOrderItems = async ({
  orderId,
  items, // already validated & priced
  session,
}) => {
  const created = await repo.createMany(
    items.map((i) => ({
      ...i,
      orderId,
      status: 'created',
    })),
    session,
  );

  // ❌ Do NOT cache here (order not committed yet)
  return created;
};

exports.getItemsByOrder = async (orderId) => {
  const key = cache.keys.byOrder(orderId);

  const cached = await cache.get(key);
  if (cached) return cached;

  const items = await repo.findByOrderId(orderId);

  await cache.set(key, items, 300);
  return items;
};

exports.getVendorItems = async (vendorId, status) => {
  const key = cache.keys.byVendor(vendorId, status);

  const cached = await cache.get(key);
  if (cached) return cached;

  const items = await repo.findByVendor(vendorId, status ? { status } : {});

  await cache.set(key, items, 300);
  return items;
};

exports.updateStatus = async ({ orderItemId, newStatus }) => {
  const item = await repo.findById(orderItemId);
  if (!item) error('Order item not found', 404);

  const allowed = ORDER_ITEM_TRANSITIONS[item.status] || [];
  if (!allowed.includes(newStatus)) {
    error(`Invalid transition ${item.status} → ${newStatus}`, 409);
  }

  const order = await orderRepo.findById(item.orderId);
  if (!order) error('Order not found', 404);

  if (
    ['packed', 'shipped', 'delivered'].includes(newStatus) &&
    order.paymentStatus !== PAYMENT_STATUS.PAID
  ) {
    error('Payment required before fulfillment', 409);
  }

  const updated = await repo.updateStatus(orderItemId, newStatus);

  // 🔁 ORDER AUTO-AGGREGATION
  const items = await repo.findByOrderId(item.orderId);

  if (items.every((i) => i.status === 'delivered')) {
    await orderRepo.updateStatus(item.orderId, { orderStatus: 'delivered' });
  } else if (items.every((i) => i.status === 'cancelled')) {
    await orderRepo.updateStatus(item.orderId, { orderStatus: 'cancelled' });
  } else {
    await orderRepo.updateStatus(item.orderId, { orderStatus: 'partial' });
  }

  await cache.del(cache.keys.byOrder(item.orderId));
  await cache.del(cache.keys.byVendor(item.vendorId));

  return updated;
};

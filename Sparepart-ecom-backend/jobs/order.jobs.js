const mongoose = require('mongoose');
const logger = require('../config/logger');

const orderRepo = require('../modules/orders/order.repo');
const inventoryService = require('../modules/inventory/inventory.service');
const couponRepo = require('../modules/coupons/coupon.repo');
const paymentRepo = require('../modules/payments/payment.repo');

const { orderQueue, enqueueAutoCancel } = require('../queues/order.queue');
const { payoutQueue } = require('../queues/payout.queue');
const { enqueueEmail } = require('../queues/email.queue');
const userRepo = require('../modules/users/user.repo'); // or wherever user lookup is
const notificationsService = require('../modules/notifications/notifications.service');
const vendorRepo = require('../modules/vendors/vendor.repo');
const EmailDispatch = require('../models/EmailDispatch');

const AUTO_CANCEL_MS = 20 * 60 * 1000; // 20 minutes

/* ============================================================
   AUTO CANCEL (TRANSACTION-SAFE, INVENTORY-SAFE)
============================================================ */
const processAutoCancel = async (orderId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await orderRepo.findById(orderId, session);
    if (!order) {
      await session.commitTransaction();
      return;
    }

    // Only auto-cancel unpaid + unconfirmed orders
    if (order.paymentStatus !== 'pending' || order.orderStatus !== 'created') {
      await session.commitTransaction();
      return;
    }

    // If payment intent exists, let it finish
    const latestPayment = await paymentRepo.findLatestByOrder(orderId, session);
    if (latestPayment && latestPayment.status === 'created') {
      logger.info('Auto-cancel skipped, payment intent exists', { orderId });
      await session.commitTransaction();
      return;
    }

    // ORDER MUTATION (SINGLE SOURCE OF TRUTH)
    await orderRepo.applyOrderMutation({
      orderId,
      reason: 'auto_cancel',
      actor: { type: 'system' },
      session,
      mutateFn: (o) => {
        o.orderStatus = 'cancelled';
        o.paymentStatus = 'failed';
      },
    });

    // RELEASE INVENTORY (IN SAME TX)
    const items = await orderRepo.findItemsByOrder(orderId, session);
    for (const item of items) {
      await inventoryService.release(
        item.productId,
        item.quantity,
        session,
        { orderId },
      );
    }

    // PAYMENT RECORD
    await paymentRepo.markFailedByOrder(orderId, 'auto_cancel', session);

    // COUPON ROLLBACK
    if (order.couponId) {
      await couponRepo.unlockCoupon({
        couponId: order.couponId,
        userId: order.userId,
        scope: 'coupon',
      });
      await couponRepo.removeUsageByOrder(orderId, session);
    }

    await session.commitTransaction();

    await enqueueStatusNotification(orderId, 'cancelled');

    logger.info('Order auto-cancelled safely', { orderId });
  } catch (err) {
    await session.abortTransaction();
    logger.error('Auto-cancel failed', { orderId, err });
    throw err;
  } finally {
    session.endSession();
  }
};

/* ============================================================
   SCHEDULERS & DISPATCHERS (SAFE)
============================================================ */

const scheduleAutoCancel = async (orderId) => {
  await enqueueAutoCancel(orderId, AUTO_CANCEL_MS);
};

const dispatchShipmentPrep = async (orderId) =>
  orderQueue.add(
    'prepare-shipment',
    { orderId },
    { attempts: 3, removeOnComplete: true, removeOnFail: true },
  );

const dispatchVendorPayoutEligibility = async (orderId) =>
  orderQueue.add(
    'vendor-payout-eligibility',
    { orderId },
    { attempts: 3, removeOnComplete: true, removeOnFail: true },
  );

const enqueueStatusNotification = async (orderId, status) => {
  // 1️⃣ enqueue internal notification job
  await orderQueue.add(
    'order-status-notification',
    { orderId, status },
    { attempts: 3, removeOnComplete: true, removeOnFail: true },
  );

  // 2️⃣ fetch order safely
  const order = await orderRepo.findByIdLean(orderId);
  if (!order) return;

  // 3️⃣ fetch user safely
  const user = await userRepo.findById(order.userId);
  if (!user?.email) return;

  // 4️⃣ map status → email template
  const templateMap = {
    created: 'order_placed',
    confirmed: 'order_confirmed',
    shipped: 'order_shipped',
    delivered: 'order_delivered',
    cancelled: 'order_cancelled',
  };

  const templateName = templateMap[status];
  if (!templateName) return;

  if (templateName) {
  await sendOrderEmailOnce({
    orderId,
    type: templateName.toUpperCase(),
    to: user.email,
    template: templateName,
    variables: {
      orderNumber: order.orderNumber,
      status,
      trackingNumber: order.shipment?.trackingNumber || null,
    },
  });
}


  // 5️⃣ enqueue email (DO NOT await)
  enqueueEmail({
    templateName,
    to: user.email,
    variables: {
      orderNumber: order.orderNumber,
      status,
    },
  });

  // In-app notification for customer
  await notificationsService.create({
    userId: order.userId,
    type: 'inapp',
    audience: 'user',
    title: `Order ${order.orderNumber} ${status}`,
    message: `Your order ${order.orderNumber} is now ${status}.`,
    metadata: { orderId, status },
  });

  // Vendor notifications (multi-vendor orders fan out)
  const items = await orderRepo.findItemsByOrder(orderId);
  const vendorIds = [
    ...new Set(
      items
        .map((i) => (i.vendorId ? String(i.vendorId) : null))
        .filter(Boolean),
    ),
  ];
  for (const vendorId of vendorIds) {
    const vendor = await vendorRepo.findById(vendorId);
    if (!vendor?.ownerUserId) continue;
    await notificationsService.create({
      userId: vendor.ownerUserId,
      type: 'inapp',
      audience: 'vendor',
      title: `Order ${order.orderNumber} ${status}`,
      message: `An order item under your catalog is ${status}.`,
      metadata: { orderId, vendorId, status },
    });
  }

  // Admin stream notification (broadcast)
  await notificationsService.create({
    userId: null,
    type: 'inapp',
    audience: 'admin',
    title: `Order ${order.orderNumber} ${status}`,
    message: `Order ${order.orderNumber} moved to ${status}.`,
    metadata: { orderId, status },
  });
};

const dispatchPayoutProcessing = async (orderId) =>
  payoutQueue.add(
    'process',
    { orderId },
    { attempts: 3, removeOnComplete: true, removeOnFail: true },
  );

const sendOrderEmailOnce = async ({ orderId, type, to, template, variables }) => {
  const exists = await EmailDispatch.findOne({ orderId, type });
  if (exists) return;

  await emailNotification.send({
    to,
    template,
    variables,
  });

  await EmailDispatch.create({ orderId, type });
};

/* ============================================================
   CANCEL AUTO-CANCEL JOB (SAFE)
============================================================ */
const cancelAutoCancel = async (orderId) => {
  const jobs = await orderQueue.getDelayed();
  await Promise.all(
    jobs
      .filter((j) => j.name === 'auto-cancel' && j.data?.orderId === orderId)
      .map((j) => j.remove()),
  );
};

module.exports = {
  scheduleAutoCancel,
  processAutoCancel,
  dispatchShipmentPrep,
  dispatchVendorPayoutEligibility,
  enqueueStatusNotification,
  dispatchPayoutProcessing,
  cancelAutoCancel,
};

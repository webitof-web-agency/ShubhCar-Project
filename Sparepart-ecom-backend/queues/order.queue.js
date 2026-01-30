const { createQueue } = require('../config/queue');

/* ============================================================
   ORDER QUEUE
============================================================ */

const orderQueue = createQueue('order');

/* ============================================================
   JOB NAMES (SINGLE SOURCE OF TRUTH)
============================================================ */

const ORDER_JOBS = {
  AUTO_CANCEL: 'auto-cancel',
  RELEASE_INVENTORY: 'release-inventory',
  PREPARE_SHIPMENT: 'prepare-shipment',
  ORDER_STATUS_NOTIFICATION: 'order-status-notification',
  VENDOR_PAYOUT_ELIGIBILITY: 'vendor-payout-eligibility',
};

/* ============================================================
   ENQUEUE HELPERS (ONLY ENQUEUE, NO LOGIC)
============================================================ */

/**
 * Schedule auto-cancel for unpaid orders
 */
const enqueueAutoCancel = async (orderId, delayMs) =>
  orderQueue.add(
    ORDER_JOBS.AUTO_CANCEL,
    { orderId },
    {
      delay: delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  );

/**
 * Release inventory (used for failures / rollbacks)
 */
const enqueueReleaseInventory = async (orderId) =>
  orderQueue.add(
    ORDER_JOBS.RELEASE_INVENTORY,
    { orderId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  );

/**
 * Prepare shipment after order confirmation
 */
const enqueueShipmentPrep = async (orderId) =>
  orderQueue.add(
    ORDER_JOBS.PREPARE_SHIPMENT,
    { orderId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  );

/**
 * Send order status email + notifications
 */
const enqueueOrderStatusNotification = async (orderId, status) =>
  orderQueue.add(
    ORDER_JOBS.ORDER_STATUS_NOTIFICATION,
    { orderId, status },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  );

/**
 * Vendor payout eligibility evaluation
 */
const enqueueVendorPayoutEligibility = async (orderId) =>
  orderQueue.add(
    ORDER_JOBS.VENDOR_PAYOUT_ELIGIBILITY,
    { orderId },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  );

/* ============================================================
   AUTO-CANCEL CLEANUP
============================================================ */

/**
 * Remove scheduled auto-cancel job once payment succeeds
 */
const cancelAutoCancel = async (orderId) => {
  const jobs = await orderQueue.getDelayed();
  await Promise.all(
    jobs
      .filter(
        (j) =>
          j.name === ORDER_JOBS.AUTO_CANCEL &&
          j.data?.orderId === orderId,
      )
      .map((j) => j.remove()),
  );
};

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  orderQueue,
  ORDER_JOBS,

  enqueueAutoCancel,
  enqueueReleaseInventory,
  enqueueShipmentPrep,
  enqueueOrderStatusNotification,
  enqueueVendorPayoutEligibility,
  cancelAutoCancel,
};

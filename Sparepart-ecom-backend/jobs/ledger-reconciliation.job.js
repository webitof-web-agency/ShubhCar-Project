const paymentRepo = require('../modules/payments/payment.repo');
const orderRepo = require('../modules/orders/order.repo');
const orderService = require('../modules/orders/orders.service');
const invoiceService = require('../modules/invoice/invoice.service');
const manualReviewQueue = require('../queues/manualReview.queue');
const logger = require('../config/logger');

const { PAYMENT_RECORD_STATUS, PAYMENT_STATUS } = require('../constants/paymentStatus');

module.exports = async function reconcilePayments() {
  // 🔍 Get recent payments (last 48 hours)
  const payments = await paymentRepo.findRecent(48);

  for (const payment of payments) {
    const order = await orderRepo.findById(payment.orderId);
    if (!order) {
      logger.error('Reconciliation: order missing', {
        paymentId: payment._id,
      });
      continue;
    }

    /* =====================
       CASE 1: Payment success but order not confirmed
    ===================== */
    if (
      payment.status === PAYMENT_RECORD_STATUS.SUCCESS &&
      order.paymentStatus !== PAYMENT_STATUS.PAID
    ) {
      logger.warn('Reconciliation: fixing unpaid order', {
        orderId: order._id,
      });

      await orderService.confirmOrder(order._id);
      await invoiceService.generateFromOrder(order);
      continue;
    }

    /* =====================
       CASE 2: Order confirmed but payment not success
    ===================== */
    if (
      order.paymentStatus === PAYMENT_STATUS.PAID &&
      payment.status !== PAYMENT_RECORD_STATUS.SUCCESS
    ) {
      await manualReviewQueue.add('payment-order-mismatch', {
        type: 'gateway_anomaly',
        orderId: order._id,
        paymentId: payment._id,
        expectedAmount: payment.amount,
        receivedAmount: null,
      });

      logger.error('Reconciliation: paid order without success payment', {
        orderId: order._id,
        paymentId: payment._id,
      });
      continue;
    }

    /* =====================
       CASE 3: Paid order but invoice missing
    ===================== */
    if (
      order.paymentStatus === PAYMENT_STATUS.PAID &&
      !order.invoiceGenerated
    ) {
      logger.warn('Reconciliation: missing invoice', {
        orderId: order._id,
      });

      await invoiceService.generateFromOrder(order);
      continue;
    }

    /* =====================
       CASE 4: Refund mismatch
    ===================== */
    if (
      payment.status === PAYMENT_RECORD_STATUS.REFUNDED &&
      order.paymentStatus !== PAYMENT_STATUS.REFUNDED
    ) {
      logger.warn('Reconciliation: fixing refund state', {
        orderId: order._id,
      });

      await orderService.markRefunded(order._id, true);
      continue;
    }
  }
};

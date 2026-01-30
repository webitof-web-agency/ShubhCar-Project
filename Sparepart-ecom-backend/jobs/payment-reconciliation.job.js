const paymentRepo = require('../modules/payments/payment.repo');
const gatewayService = require('../modules/payments/payment.gateway.service');
const orderRepo = require('../modules/orders/order.repo');
const orderService = require('../modules/orders/orders.service');
const manualReviewQueue = require('../queues/manualReview.queue');
const invoiceService = require('../modules/invoice/invoice.service');
const logger = require('../config/logger');

const { PAYMENT_RECORD_STATUS, PAYMENT_STATUS } = require('../constants/paymentStatus');
const { ORDER_STATUS } = require('../constants/orderStatus');

async function reconcilePayments() {
  const payments = await paymentRepo.findPendingForReconciliation(48);

  for (const payment of payments) {
    try {
      const gateway = await gatewayService.fetchStatus(payment);
      if (!gateway) continue;

      const order = await orderRepo.findById(payment.orderId);
      if (!order) {
        logger.error('Reconciliation: order missing', {
          paymentId: payment._id,
        });
        continue;
      }

      /* =====================
         GATEWAY SUCCESS
      ===================== */

      if (gateway.status === 'success') {
        // CORRECTED: Check if order NOT yet paid (needs reconciliation)
        if (order.paymentStatus !== PAYMENT_STATUS.PAID) {
          // amount mismatch -> manual review
          if (
            typeof gateway.amount === 'number' &&
            Math.abs(gateway.amount - payment.amount) > 0.01
          ) {
            await manualReviewQueue.add('payment-mismatch', {
              orderId: payment.orderId,
              paymentId: payment._id,
              expectedAmount: payment.amount,
              receivedAmount: gateway.amount,
            });
            continue;
          }

          // Mark payment as successful
          await paymentRepo.markSuccess(payment._id, {
            transactionId: gateway.transactionId,
          });

          // Confirm order
          await orderService.confirmOrder(payment.orderId);

          logger.info('Payment reconciled successfully', {
            paymentId: payment._id,
            orderId: payment.orderId,
          });

          continue;
        }

        // Idempotency: Already paid, skip
        if (payment.status === PAYMENT_RECORD_STATUS.SUCCESS) continue;
      }

      /* =====================
         GATEWAY FAILURE
      ===================== */
      if (
        gateway.status === 'failed' &&
        order.orderStatus !== ORDER_STATUS.CREATED
      ) {
        if (payment.status === PAYMENT_RECORD_STATUS.FAILED) continue;

        payment.status = PAYMENT_RECORD_STATUS.FAILED;
        payment.failureReason = 'reconciled_failed';
        await paymentRepo.markFailed(payment._id, {
          reason: 'reconciled_failed',
        });

        await orderService.failOrder(payment.orderId);
        continue;
      }

      /* =====================
         GATEWAY REFUND
      ===================== */
      if (
        gateway.status === 'refunded' &&
        order.orderStatus === ORDER_STATUS.REFUNDED
      ) {
        if (payment.status === PAYMENT_RECORD_STATUS.REFUNDED) continue;

        await paymentRepo.finalizeRefund(payment._id, gateway.fullRefund);

        await orderService.markRefunded(payment.orderId, gateway.fullRefund);

        continue;
      }

      /* =====================
         MISMATCH CASES
      ===================== */
      if (
        order.paymentStatus === PAYMENT_STATUS.PAID &&
        payment.status !== PAYMENT_RECORD_STATUS.SUCCESS
      ) {
        await manualReviewQueue.add('order-payment-mismatch', {
          orderId: order._id,
          paymentId: payment._id,
          orderStatus: order.paymentStatus,
          paymentStatus: payment.status,
        });
      }
    } catch (err) {
      logger.error('Payment reconciliation error', {
        paymentId: payment._id,
        error: err.message,
      });
    }
  }
}

module.exports = { reconcilePayments };

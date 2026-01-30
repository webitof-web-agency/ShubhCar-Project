const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  // eslint-disable-next-line no-console
  console.warn('Worker disabled: REDIS_URL not set');
  module.exports = { worker: null, disabled: true };
} else {
  const { Worker } = require('bullmq');
  const { connection } = require('../config/queue');

  const paymentRepo = require('../modules/payments/payment.repo');
  const orderRepo = require('../modules/orders/order.repo');
  const logger = require('../config/logger');
  const { logWorkerFailure } = require('../utils/workerLogger');

  const {
    PAYMENT_RECORD_STATUS,
    PAYMENT_STATUS,
  } = require('../constants/paymentStatus');
  const { ORDER_STATUS } = require('../constants/orderStatus');

  let worker = null;

  try {
    worker = new Worker(
      'payment-retry',
      async (job) => {
        try {
          const { orderId, gateway, reason } = job.data;

          logger.info('Payment retry job received', {
            orderId,
            gateway,
            reason,
          });

          const order = await orderRepo.findById(orderId);
          if (!order) return;

          if (order.paymentStatus === PAYMENT_STATUS.PAID) {
            logger.info('Payment retry skipped; already paid', { orderId });
            return;
          }

          const existingOpen = await paymentRepo.findOpenByOrderAndGateway(
            orderId,
            gateway,
          );
          if (existingOpen) {
            logger.info('Open payment exists, skipping retry', {
              orderId,
              gateway,
            });
            return;
          }

          await paymentRepo.failOpenPayments(orderId, gateway, reason);

          const payment = await paymentRepo.create({
            orderId,
            paymentGateway: gateway,
            status: PAYMENT_RECORD_STATUS.CREATED,
            amount: order.payableAmount || order.grandTotal,
            metadata: { retry: true, retryReason: reason },
          });

          await orderRepo.updatePaymentStatus?.(orderId, PAYMENT_STATUS.PENDING);
          await orderRepo.updateOrderStatus?.(orderId, ORDER_STATUS.CREATED);

          logger.info('Payment retry intent created', {
            orderId,
            gateway,
            paymentId: payment?._id,
          });
        } catch (err) {
          logWorkerFailure('paymentRetry', job, err);
          throw err;
        }
      },
      { connection },
    );

    worker.on('failed', (job, err) => {
      logWorkerFailure('paymentRetry', job, err);
    });
  } catch (err) {
    logger.error('Payment retry worker initialization failed', {
      error: err.message,
    });
  }

  module.exports = { worker, disabled: false };
}

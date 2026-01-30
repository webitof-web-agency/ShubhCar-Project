const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  // eslint-disable-next-line no-console
  console.warn('Worker disabled: REDIS_URL not set');
  module.exports = { worker: null, disabled: true };
} else {
  const { Worker } = require('bullmq');
  const { connection } = require('../config/queue');
  const { connectRedis } = require('../config/redis');
  const splitRepo = require('../modules/orders/orderVendorSplit.repo');
  const orderRepo = require('../modules/orders/order.repo');
  const logger = require('../config/logger');
  const { logWorkerFailure } = require('../utils/workerLogger');

  connectRedis().catch((err) =>
    // eslint-disable-next-line no-console
    console.error('Failed to connect Redis for payout worker', err),
  );

  let worker = null;

  try {
    worker = new Worker(
      'payout',
      async (job) => {
        try {
          const { orderId } = job.data;
          const order = await orderRepo.findById(orderId);
          if (!order) return;
          if (order.paymentStatus !== 'paid') {
            logger.info('Payout skipped, order unpaid', { orderId });
            return;
          }

          const split = await splitRepo.findByOrder(orderId);
          if (!split) return;
          if (split.status !== 'pending') return;

          await splitRepo.updateStatusByOrder(orderId, 'processing');
          logger.info('Payout processing started', { orderId });
        } catch (err) {
          logWorkerFailure('payout', job, err);
          throw err;
        }
      },
      { connection },
    );

    worker.on('failed', (job, err) => {
      logWorkerFailure('payout', job, err);
    });
  } catch (err) {
    logger.error('Payout worker initialization failed', { error: err.message });
  }

  module.exports = { worker, disabled: false };
}

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  // eslint-disable-next-line no-console
  console.warn('Worker disabled: REDIS_URL not set');
  module.exports = { worker: null, disabled: true };
} else {
  const { Worker } = require('bullmq');
  const { connection } = require('../config/queue');
  const { connectRedis } = require('../config/redis');
  const orderRepo = require('../modules/orders/order.repo');
  const inventoryService = require('../modules/inventory/inventory.service');
  const logger = require('../config/logger');
  const { logWorkerFailure } = require('../utils/workerLogger');

  connectRedis().catch((err) =>
    // eslint-disable-next-line no-console
    console.error('Failed to connect Redis for inventory release worker', err),
  );

  let worker = null;

  try {
    worker = new Worker(
      'inventory',
      async (job) => {
        try {
          if (job.name !== 'release') return;
          const orderId = job.data.orderId;
          const items = await orderRepo.findItemsByOrder(orderId);
          for (const item of items) {
            await inventoryService.release(item.productId, item.quantity, null, {
              orderId,
              reason: 'order_cancelled',
            });
          }
          logger.info('Inventory released for order', { orderId });
        } catch (err) {
          logWorkerFailure('inventoryRelease', job, err);
          throw err;
        }
      },
      { connection },
    );

    worker.on('failed', (job, err) => {
      logWorkerFailure('inventoryRelease', job, err);
    });
  } catch (err) {
    logger.error('Inventory release worker initialization failed', {
      error: err.message,
    });
  }

  module.exports = { worker, disabled: false };
}

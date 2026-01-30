const cron = require('node-cron');
const logger = require('../config/logger');
const { redis } = require('../config/redis');
const { reconcilePayments } = require('../jobs/payment-reconciliation.job');

function startPaymentReconciliationCron() {
  cron.schedule('*/15 * * * *', async () => {
    const lockKey = 'payment:reconcile:lock';

    const locked = await redis.set(lockKey, '1', {
      NX: true,
      EX: 30 * 60, // 30 minutes
    });

    if (!locked) return;

    logger.info('🧾 Payment reconciliation started');

    try {
      await reconcilePayments();
      logger.info('🧾 Payment reconciliation finished');
    } catch (err) {
      logger.error('❌ Payment reconciliation failed', {
        error: err.message,
      });
    } finally {
      await redis.del(lockKey);
    }
  });
}

module.exports = { startPaymentReconciliationCron };

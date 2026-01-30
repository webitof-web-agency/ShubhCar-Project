const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { captureException, isSentryEnabled } = require('./config/observability');

const { connectMongo, disconnectMongo } = require('./config/mongo');
const { connectRedis, disconnectRedis } = require('./config/redis');
const { scheduleCouponExpiry } = require('./modules/coupons/coupon.cron');
const {
  startPaymentReconciliationCron,
} = require('./crons/payment-reconciliation.cron');
const {
  ensureVehicleAttributeDefaults,
} = require('./modules/vehicle-management/migrations/vehicle-management.seed');
const {
  migrateVariantNameAttribute,
} = require('./modules/vehicle-management/migrations/vehicle-management.migration');

const start = async () => {
  try {
    // 🚀 Parallel startup with timeout safety
    await Promise.all([connectMongo(), connectRedis()]);
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
  scheduleCouponExpiry();
  startPaymentReconciliationCron();
  await ensureVehicleAttributeDefaults();
  await migrateVariantNameAttribute();

  const server = app.listen(env.PORT, () => {
    logger.info('server_started', { event: 'server_started', port: env.PORT });
  });

  const shutdown = async () => {
    logger.info('graceful_shutdown_initiated', {
      event: 'graceful_shutdown',
    });
    server.close(async () => {
      await disconnectRedis();
      await disconnectMongo();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandled_promise_rejection', {
      reason: reason?.message || reason,
      stack: reason?.stack,
    });
    captureException(reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('uncaught_exception', {
      error: err.message,
      stack: err.stack,
    });
    if (isSentryEnabled()) {
      captureException(err);
    }
    process.exit(1);
  });
};

start();
// Forced restart to load new env vars

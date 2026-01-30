const cron = require('node-cron');
const reconcilePayments = require('../jobs/ledger-reconciliation.job');
const logger = require('../config/logger');

cron.schedule('0 * * * *', async () => {
  logger.info('🧾 Reconciliation cron started');

  try {
    await reconcilePayments();
    logger.info('🧾 Reconciliation cron finished');
  } catch (err) {
    logger.error('❌ Reconciliation cron failed', { error: err.message });
  }
});

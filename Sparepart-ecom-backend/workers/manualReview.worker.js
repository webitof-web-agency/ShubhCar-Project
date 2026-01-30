const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  // eslint-disable-next-line no-console
  console.warn('Worker disabled: REDIS_URL not set');
  module.exports = { worker: null, disabled: true };
} else {
  const { Worker } = require('bullmq');
  const { connection } = require('../config/queue');
  const ManualReview = require('../models/ManualReview.model');
  const logger = require('../config/logger');
  const { logWorkerFailure } = require('../utils/workerLogger');

  let worker = null;

  try {
    worker = new Worker(
      'manual-review',
      async (job) => {
        try {
          const data = job.data;

          const exists = await ManualReview.findOne({
            paymentId: data.paymentId,
            status: 'pending',
          });

          if (exists) {
            logger.info('Manual review already exists', {
              paymentId: data.paymentId,
            });
            return;
          }

          await ManualReview.create({
            paymentId: data.paymentId,
            amount: data.amount,
            currency: data.currency,
            reason: data.reason,
            gateway: data.gateway,
            status: 'pending',
            metadata: data.metadata,
          });

          logger.info('Manual review created', { paymentId: data.paymentId });
        } catch (err) {
          logWorkerFailure('manualReview', job, err);
          throw err;
        }
      },
      { connection },
    );

    worker.on('failed', (job, err) => {
      logWorkerFailure('manual-review', job, err);
    });
  } catch (err) {
    logger.error('Manual review worker initialization failed', {
      error: err.message,
    });
  }

  module.exports = { worker, disabled: false };
}

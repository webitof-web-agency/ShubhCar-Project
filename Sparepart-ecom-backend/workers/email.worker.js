// backend/workers/email.worker.js
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  // eslint-disable-next-line no-console
  console.warn('Worker disabled: REDIS_URL not set');
  module.exports = { worker: null, disabled: true };
} else {
  const { Worker } = require('bullmq');
  const { connection } = require('../config/queue');
  const logger = require('../config/logger');
  const emailNotification = require('../services/emailNotification.service');
  const { logWorkerFailure } = require('../utils/workerLogger');

  let worker = null;

  try {
    worker = new Worker(
      'email',
      async (job) => {
        try {
          if (job.name !== 'send') return;

          const { templateName, to, variables } = job.data;
          await emailNotification.send({ templateName, to, variables });
        } catch (err) {
          logWorkerFailure('email', job, err);
          throw err;
        }
      },
      { connection },
    );

    worker.on('failed', (job, err) => {
      logWorkerFailure('email', job, err);
    });

    logger.info('email_worker_started', { worker: 'email' });
  } catch (err) {
    logger.error('Email worker initialization failed', { error: err.message });
  }

  module.exports = { worker, disabled: false };
}

const logger = require('../config/logger');

function logWorkerFailure(worker, job, err) {
  logger.error('worker_failure', {
    type: 'worker_failure',
    worker,
    jobName: job?.name,
    jobId: job?.id || job?.jobId,
    entityId:
      job?.data?.orderId ||
      job?.data?.paymentId ||
      job?.data?.vendorId ||
      job?.data?.userId ||
      job?.data?.productId ||
      null,
    errorCode: err?.code || err?.name || err?.message || 'UNKNOWN',
    retryCount: job?.attemptsMade ?? job?.attempts ?? 0,
    requestId: job?.data?.requestId || null,
  });
}

module.exports = { logWorkerFailure };

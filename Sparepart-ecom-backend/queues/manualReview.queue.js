const { Queue } = require('bullmq');
const { connection } = require('../config/queue');

const manualReviewQueue = new Queue('manual-review', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

module.exports = manualReviewQueue;

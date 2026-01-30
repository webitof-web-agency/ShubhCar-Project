// backend/queues/email.queue.js
const { createQueue } = require('../config/queue');

const emailQueue = createQueue('email');

const enqueueEmail = async ({ templateName, to, variables }) => {
  return emailQueue.add(
    'send',
    { templateName, to, variables },
    {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    },
  );
};

module.exports = { emailQueue, enqueueEmail };

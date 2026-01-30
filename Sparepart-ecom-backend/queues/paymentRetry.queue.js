const { Queue } = require('bullmq');
const { connection } = require('../config/queue');

const paymentRetryQueue = new Queue('payment-retry', { connection });

module.exports = { paymentRetryQueue };

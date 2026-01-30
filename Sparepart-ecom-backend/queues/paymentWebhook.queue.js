const { Queue } = require('bullmq');
const { connection } = require('../config/queue');

const paymentWebhookQueue = new Queue('payment-webhook', { connection });

module.exports = { paymentWebhookQueue };

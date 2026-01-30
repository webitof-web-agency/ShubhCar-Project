const { Queue } = require('bullmq');
const { connection } = require('../config/queue');

const payoutQueue = new Queue('payout', { connection });

module.exports = { payoutQueue };

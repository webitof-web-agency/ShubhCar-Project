const { Queue } = require('bullmq');
const env = require('./env');
const logger = require('./logger');

const queuesEnabled = Boolean(env.REDIS_URL);

let connection = null;
let createQueue = () => ({
  // no-op queue stub for test / local without redis
  add: async () => null,
});

if (queuesEnabled) {
  connection = {
    url: env.REDIS_URL,
  };
  createQueue = (name) => new Queue(name, { connection });
} else {
  logger.warn('Queues disabled: REDIS_URL not set');
}

module.exports = { createQueue, connection };

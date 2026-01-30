const { createClient } = require('redis');
const env = require('./env');
const logger = require('./logger');
const { redisUpGauge } = require('./metrics');

const redisEnabled = Boolean(env.REDIS_URL);

const createNoopClient = () => ({
  isOpen: false,
  get: async () => null,
  set: async () => { },
  del: async () => 0,
  setEx: async () => { },
  scanIterator: async function* scanIterator() { },
  quit: async () => { },
});

let redis = createNoopClient();
let connectRedis = async () => { };
let disconnectRedis = async () => { };

if (redisEnabled) {
  redis = createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnect failed');
          return new Error('Redis down');
        }
        return Math.min(retries * 200, 3000);
      },
    },
  });

  redis.on('connect', () => {
    logger.info('Redis connecting');
    redisUpGauge.set(0.5);
  });
  redis.on('ready', () => {
    logger.info('Redis ready');
    redisUpGauge.set(1);
  });
  redis.on('error', (err) => {
    logger.error('Redis error', err);
    redisUpGauge.set(0);
  });
  redis.on('end', () => {
    logger.warn('Redis disconnected');
    redisUpGauge.set(0);
  });

  connectRedis = async () => {
    if (!redis.isOpen) await redis.connect();
  };

  disconnectRedis = async () => {
    if (redis.isOpen) await redis.quit();
  };
} else {
  logger.warn('Redis disabled: REDIS_URL not set');
}


module.exports = { redis, connectRedis, disconnectRedis, redisEnabled };

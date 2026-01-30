const { redis } = require('../config/redis');
const { jsonGet, jsonSet } = require('./cacheUtils');
const keys = require('../lib/cache/keys');

exports.keys = keys.orderItems;

exports.get = async (key) => jsonGet(key, 'order_items');

exports.set = async (key, value, ttl = 300) => jsonSet(key, value, ttl);

exports.del = async (key) => {
  await redis.del(key);
};

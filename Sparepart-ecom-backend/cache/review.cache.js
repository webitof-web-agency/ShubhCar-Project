const { jsonGet, jsonSet, deleteKey, deleteByPattern } = require('./cacheUtils');
const keys = require('../lib/cache/keys');

const TTL = 60 * 5; // 5 minutes

const key = keys.reviews;

const get = async (k) => jsonGet(k, 'reviews');
const set = async (k, value) => jsonSet(k, value, TTL);

const clearProduct = async (productId) => {
  await deleteByPattern(key.product(productId));
  await deleteByPattern(key.aggregate(productId));
};

const del = async (k) => {
  await deleteKey(k);
};

module.exports = { key, get, set, del, clearProduct };

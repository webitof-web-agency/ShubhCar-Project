const { jsonGet, jsonSet, deleteKey, deleteByPattern } = require('./cacheUtils');
const cacheKeys = require('../lib/cache/keys');

const TTL = 60 * 45; // 45 minutes for category tree
const CATEGORY_PATTERN = 'catalog:categories:*';

// Use the shared cache key helpers to avoid duplicate definitions.
const key = cacheKeys.catalog.categories;

const get = (k) => jsonGet(k, 'category');
const set = (k, value, ttl = TTL) => jsonSet(k, value, ttl);
const del = async (k) => {
  if (!k) return;
  await deleteKey(k);
};

const clearAll = async () => {
  await deleteByPattern(CATEGORY_PATTERN);
};

module.exports = { key, get, set, del, clearAll };

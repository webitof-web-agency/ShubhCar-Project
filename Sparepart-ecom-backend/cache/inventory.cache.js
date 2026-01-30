const { jsonGet, jsonSet, deleteByPattern } = require('./cacheUtils');
const keys = require('../lib/cache/keys');

const TTL = 30; // 30 seconds for fast-changing inventory

const key = keys.inventory.product;

const get = async (productId) => jsonGet(key(productId), 'inventory');
const set = async (productId, value) => jsonSet(key(productId), value, TTL);
const del = async (productId) => deleteByPattern(key(productId));

module.exports = { key, get, set, del };

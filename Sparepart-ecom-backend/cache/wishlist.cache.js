const { jsonGet, jsonSet, deleteKey } = require('./cacheUtils');
const keys = require('../lib/cache/keys');

const TTL = 60 * 5; // 5 minutes

const key = keys.wishlist;

const get = async (k) => jsonGet(k, 'wishlist');
const set = async (k, value) => jsonSet(k, value, TTL);
const clearUser = async (userId) => deleteKey(key.user(userId));

module.exports = { key, get, set, clearUser };

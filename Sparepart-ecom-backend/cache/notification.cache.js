const { jsonGet, jsonSet, deleteByPattern } = require('./cacheUtils');
const keys = require('../lib/cache/keys');

const TTL = 60 * 5; // 5 minutes

const key = keys.notifications;

const get = async (k) => jsonGet(k);
const set = async (k, value) => jsonSet(k, value, TTL);
const clearUser = async (userId) => deleteByPattern(`notif:user:${userId}*`);

module.exports = { key, get, set, clearUser };

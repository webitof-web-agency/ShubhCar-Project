const { jsonGet, jsonSet } = require('./cacheUtils');
const { redis } = require('../config/redis');
const keys = require('../lib/cache/keys');

const TTL_SECONDS = 60 * 20; // 20 minutes

const key = keys.user;

const getById = (id) => jsonGet(key.byId(id), 'user');
const getByEmail = (email) => jsonGet(key.byEmail(email), 'user');
const getByPhone = (phone) => jsonGet(key.byPhone(phone), 'user');

const setById = (id, user) => jsonSet(key.byId(id), user, TTL_SECONDS);
const setByEmail = (email, user) =>
  jsonSet(key.byEmail(email), user, TTL_SECONDS);
const setByPhone = (phone, user) =>
  jsonSet(key.byPhone(phone), user, TTL_SECONDS);

const delById = (id) => redis.del(key.byId(id));
const delByEmail = (email) => redis.del(key.byEmail(email));
const delByPhone = (phone) => redis.del(key.byPhone(phone));

const invalidate = async (user) => {
  const keys = [];
  if (user?._id) keys.push(key.byId(user._id));
  if (user?.email) keys.push(key.byEmail(user.email));
  if (user?.phone) keys.push(key.byPhone(user.phone));
  if (keys.length) {
    await redis.del(keys);
  }
};

module.exports = {
  key,
  getById,
  getByEmail,
  getByPhone,
  setById,
  setByEmail,
  setByPhone,
  delById,
  delByEmail,
  delByPhone,
  invalidate,
};

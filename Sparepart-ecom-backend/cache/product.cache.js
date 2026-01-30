const { jsonGet, jsonSet, deleteByPattern } = require('./cacheUtils');
const keys = require('../lib/cache/keys');

const TTL_DETAIL = 60 * 10; // 10 minutes
const TTL_LIST = 60 * 3; // 3 minutes

const key = keys.product;

const get = (k) => jsonGet(k, 'product');
const setDetail = (k, value) => jsonSet(k, value, TTL_DETAIL);
const setList = (k, value) => jsonSet(k, value, TTL_LIST);

const invalidateProduct = async (...slugs) => {
  const unique = Array.from(new Set(slugs.filter(Boolean)));
  if (!unique.length) return;
  await Promise.all(
    unique.map((slug) => deleteByPattern(`product:slug:${slug}:*`)),
  );
};

const invalidateLists = async () => {
  await deleteByPattern('products:list:*');
  await deleteByPattern('products:featured:*');
};

module.exports = {
  key,
  get,
  setDetail,
  setList,
  invalidateProduct,
  invalidateLists,
};

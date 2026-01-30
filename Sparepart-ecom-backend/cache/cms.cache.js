const { jsonGet, jsonSet, deleteByPattern } = require('./cacheUtils');
const keys = require('../lib/cache/keys');

const TTL = 60 * 60 * 6; // 6 hours for CMS/static-ish pages

const key = keys.cms;

const get = async (k) => jsonGet(k, 'cms');
const set = async (k, value) => jsonSet(k, value, TTL);
const clearPage = async (slug) => {
  if (!slug) return;
  await deleteByPattern(key.page(slug));
  await deleteByPattern(key.seo(slug));
};
const clearAll = async () => deleteByPattern('cms:*');

module.exports = { key, get, set, clearPage, clearAll };

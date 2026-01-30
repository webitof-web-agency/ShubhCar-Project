const { redis } = require('../config/redis');

const VERSION_KEY = 'products:version';

const getVersion = async () => {
  const v = await redis.get(VERSION_KEY);
  if (v) return v;

  await redis.set(VERSION_KEY, 'v1');
  return 'v1';
};

const bumpVersion = async () => {
  const v = await getVersion();
  const next = `v${parseInt(v.slice(1)) + 1}`;
  await redis.set(VERSION_KEY, next);
  return next;
};

module.exports = { getVersion, bumpVersion };

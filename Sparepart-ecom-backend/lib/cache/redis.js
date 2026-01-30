const { createClient } = require('redis');
const logger = require('../../config/logger');

let client;

const ensureClient = async () => {
  if (!process.env.REDIS_URL) return null;
  
  if (client) {
    return client.isOpen ? client : null;
  }

  try {
    client = createClient({ url: process.env.REDIS_URL });

    client.on('error', (err) => {
      logger.warn('Redis error (cache disabled)', { error: err.message });
    });

    await client.connect();
    return client;
  } catch (err) {
    logger.warn('Redis connect failed (cache disabled)', { error: err.message });
    client = null;
    return null;
  }
};

const get = async (key) => {
  const c = await ensureClient();
  if (!c) return null;
  try {
    const raw = await c.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn('Redis get failed', { key, error: err.message });
    return null;
  }
};

const set = async (key, value, ttlSeconds) => {
  const c = await ensureClient();
  if (!c) return;
  try {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await c.set(key, payload, { EX: ttlSeconds });
    } else {
      await c.set(key, payload);
    }
  } catch (err) {
    logger.warn('Redis set failed', { key, error: err.message });
  }
};

const del = async (pattern) => {
  const c = await ensureClient();
  if (!c) return;
  try {
    if (!pattern.includes('*')) {
      await c.del(pattern);
      return;
    }
    const keys = [];
    for await (const key of c.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }
    if (keys.length) {
      await c.del(keys);
    }
  } catch (err) {
    logger.warn('Redis del failed', { pattern, error: err.message });
  }
};

module.exports = { get, set, del };

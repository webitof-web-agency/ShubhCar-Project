const { redis } = require('../../config/redis');

const CART_TTL = 60 * 10; // 10 minutes

const key = ({ userId, sessionId }) =>
  userId ? `cart:user:${userId}` : `cart:session:${sessionId}`;

const get = async (opts) => {
  const data = await redis.get(key(opts));
  return data ? JSON.parse(data) : null;
};

const set = async (opts, value) => {
  await redis.set(key(opts), JSON.stringify(value), { EX: CART_TTL });
};

const clear = async (opts) => {
  await redis.del(key(opts));
};

// Backward-compatible helpers for existing usages
const getCart = async (userId, sessionId) => {
  const data = await get({ userId, sessionId });
  if (!data) return { items: [] };

  if (Array.isArray(data.items)) {
    const itemsMap = {};
    data.items.forEach((it) => {
      const key = it.productId || it._id;
      if (key) itemsMap[key] = it;
    });
    return { ...data, items: itemsMap };
  }

  return data;
};

const saveCart = async (userId, sessionId, cart) => {
  await set({ userId, sessionId }, cart);
};

const clearCart = async (userId, sessionId) => {
  await clear({ userId, sessionId });
};

module.exports = { get, set, clear, key, getCart, saveCart, clearCart };

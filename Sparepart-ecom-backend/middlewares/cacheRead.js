const cache = require('../lib/cache/redis');

module.exports = ({ key, ttl, allowAuth = false, allowBlocked = false }) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (!allowAuth && req.user) return next();

    const path = req.originalUrl || '';
    const blocked =
      path.includes('/cart') ||
      path.includes('/checkout') ||
      path.includes('/orders') ||
      path.includes('/payments') ||
      path.includes('/inventory') ||
      path.includes('/admin');
    if (blocked && !allowBlocked) return next();

    const cacheKey = typeof key === 'function' ? key(req) : key;
    if (!cacheKey) return next();

    const hit = await cache.get(cacheKey);
    if (hit) {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
      return res.status(200).json({
        success: true,
        message: 'OK',
        data: hit,
        meta: {},
      });
    }

    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode === 200) {
        res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
        await cache.set(cacheKey, body?.data ?? body, ttl);
      }
      return originalJson(body);
    };

    return next();
  };
};

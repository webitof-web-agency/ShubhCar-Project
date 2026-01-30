const { redis } = require('../config/redis');
const env = require('../config/env');
const { verifyToken } = require('../utils/jwt');
const logger = require('../config/logger');

const PREFIX = 'blacklist:';

class TokenBlacklistService {
  /**
   * Add token to blacklist
   * @param {string} token - JWT token string
   */
  async addToBlacklist(token) {
    try {
      const decoded = verifyToken(token, env.JWT_SECRET);
      if (!decoded || !decoded.exp) return;

      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      if (ttl > 0) {
        await redis.set(`${PREFIX}${token}`, '1', { EX: ttl });
      }
    } catch (err) {
      logger.warn('Failed to blacklist token', { error: err.message });
      // Fail open or closed? Here we fail open (log only) to not break logout flow
    }
  }

  /**
   * Check if token is blacklisted
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  async isBlacklisted(token) {
    try {
      const result = await redis.get(`${PREFIX}${token}`);
      return result === '1';
    } catch (err) {
      logger.error('Redis error checking blacklist', { error: err.message });
      // SECURITY: Fail closed - if we can't check blacklist, reject the token
      // This prevents logged-out tokens from working during Redis outage
      throw new Error('Authentication service temporarily unavailable');
    }
  }
}

module.exports = new TokenBlacklistService();

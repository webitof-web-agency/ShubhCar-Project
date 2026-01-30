const cache = require('./redis');

const deletePatterns = async (patterns = []) => {
  for (const pattern of patterns) {
    await cache.del(pattern);
  }
};

module.exports = { deletePatterns };

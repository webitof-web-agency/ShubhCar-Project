const logger = require('../../config/logger');

class AuditService {
  log({ actor, action, target, meta = {} }) {
    logger.info('AUDIT', {
      actor,
      action,
      target,
      meta,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new AuditService();

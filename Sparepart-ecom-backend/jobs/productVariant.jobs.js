const logger = require('../config/logger');

const inventoryAdjust = async (payload) => {
  logger.info(`Queue: inventoryAdjust ${JSON.stringify(payload)}`);
};

const inventoryRollback = async (payload) => {
  logger.info(`Queue: inventoryRollback ${JSON.stringify(payload)}`);
};

const adminStockCorrection = async (payload) => {
  logger.info(`Queue: adminStockCorrection ${JSON.stringify(payload)}`);
};

module.exports = { inventoryAdjust, inventoryRollback, adminStockCorrection };

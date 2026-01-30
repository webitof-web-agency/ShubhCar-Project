const repo = require('./inventoryLogs.repo');
const { error } = require('../../utils/apiResponse');

class InventoryLogsService {
  list(filter = {}) {
    return repo.list(filter);
  }

  async get(id) {
    const log = await repo.findById(id);
    if (!log) error('Inventory log not found', 404);
    return log;
  }
}

module.exports = new InventoryLogsService();

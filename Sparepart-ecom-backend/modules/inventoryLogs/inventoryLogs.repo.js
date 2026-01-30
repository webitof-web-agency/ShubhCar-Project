const InventoryLog = require('../../models/InventoryLog.model');

class InventoryLogsRepo {
  list(filter = {}) {
    return InventoryLog.find(filter).sort({ createdAt: -1 }).lean();
  }

  findById(id) {
    return InventoryLog.findById(id).lean();
  }
}

module.exports = new InventoryLogsRepo();

const UserActivityLog = require('../../models/UserActivityLog.model');

class UserActivityLogsRepo {
  create(data) {
    return UserActivityLog.create(data);
  }

  list(filter = {}) {
    return UserActivityLog.find(filter).sort({ createdAt: -1 }).lean();
  }
}

module.exports = new UserActivityLogsRepo();

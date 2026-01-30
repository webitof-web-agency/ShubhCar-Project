const repo = require('./userActivityLogs.repo');

class UserActivityLogsService {
  create(payload) {
    return repo.create(payload);
  }

  list(filter = {}) {
    return repo.list(filter);
  }
}

module.exports = new UserActivityLogsService();

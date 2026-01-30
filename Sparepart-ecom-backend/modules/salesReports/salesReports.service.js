const repo = require('./salesReports.repo');

class SalesReportsService {
  summary(params) {
    return repo.summary(params);
  }

  list(filter = {}) {
    return repo.list(filter);
  }

  async get(id) {
    const report = await repo.findById(id);
    if (!report) throw new Error('Sales report not found');
    return report;
  }

  create(payload) {
    return repo.create(payload);
  }

  async update(id, payload) {
    const updated = await repo.update(id, payload);
    if (!updated) throw new Error('Sales report not found');
    return updated;
    }

  async remove(id) {
    const deleted = await repo.remove(id);
    if (!deleted) throw new Error('Sales report not found');
    return deleted;
  }
}

module.exports = new SalesReportsService();

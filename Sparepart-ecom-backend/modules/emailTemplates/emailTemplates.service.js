const repo = require('./emailTemplates.repo');
const { error } = require('../../utils/apiResponse');

class EmailTemplatesService {
  list(filter = {}) {
    return repo.list(filter);
  }

  async get(id) {
    const tpl = await repo.findById(id);
    if (!tpl) error('Email template not found', 404);
    return tpl;
  }

  async create(payload) {
    return repo.create(payload);
  }

  async update(id, payload) {
    const updated = await repo.update(id, payload);
    if (!updated) error('Email template not found', 404);
    return updated;
  }

  async remove(id) {
    const deleted = await repo.remove(id);
    if (!deleted) error('Email template not found', 404);
    return deleted;
  }
}

module.exports = new EmailTemplatesService();

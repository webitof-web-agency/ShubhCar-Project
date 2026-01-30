const repo = require('./tax.repo');
const { error } = require('../../utils/apiResponse');

class TaxService {
  list(query = {}) {
    const filter = {};
    if (query.hsnCode) filter.hsnCode = query.hsnCode;
    if (query.status) filter.status = query.status;
    return repo.list(filter);
  }

  create(payload) {
    if (!payload.hsnCode) error('hsnCode is required', 400);
    if (payload.rate == null) error('rate is required', 400);
    return repo.create(payload);
  }

  update(id, payload) {
    return repo.update(id, payload);
  }

  remove(id) {
    return repo.remove(id);
  }
}

module.exports = new TaxService();

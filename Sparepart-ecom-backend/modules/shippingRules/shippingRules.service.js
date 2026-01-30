const repo = require('./shippingRules.repo');
const { error } = require('../../utils/apiResponse');

class ShippingRulesService {
  list(query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.country) filter.country = query.country;
    return repo.list(filter);
  }

  create(payload) {
    if (!payload.name) error('name is required', 400);
    if (payload.baseRate == null) error('baseRate is required', 400);
    return repo.create(payload);
  }

  update(id, payload) {
    return repo.update(id, payload);
  }

  remove(id) {
    return repo.remove(id);
  }
}

module.exports = new ShippingRulesService();
